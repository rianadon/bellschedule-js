window.bellSchedule = {
  index: null,
  schedules: null,
  /* Refreshes the current schedule */
  refresh() {
    return new Promise((resolve, reject) => {
      // Fetch the schedule from HarkerDev/schedules
      const req = new XMLHttpRequest();
      req.open('GET', 'https://raw.githubusercontent.com/HarkerDev/bellschedule/gh-pages/index.html', true);
      req.onload = () => {
        if (req.status === 200) {
          // The schedule loaded; now parse it
          // First get the text of the div element that surrounds the schedule
          const parser = new DOMParser();
          const htmldoc = parser.parseFromString(req.responseText, 'text/html');
          const days = htmldoc.getElementById('schedules').textContent
            .replace(/\n{3,}/g, '\n\n').split('\n\n');
          this.index = new Map();
          this.schedules = new Map();
          // The first part of the schedule assigns days to schedules
          for (const line of days.shift().split('\n')) {
            const [day, label, mapping] = line.split('\t');
            // Ranges of dates are denoted by the vertical bar
            const spday = day.split('|');
            const replacements = new Map();
            // Evaluate the replacement mappings in brackets if they exist
            if (mapping) {
              for (const toReplace of mapping.substring(1, mapping.length - 1).split(',')) {
                const [before, after] = toReplace.split('->');
                replacements.set(before, after);
              }
            }
            if (spday.length === 1) { // Just one day
              this.index.set(Date.parse(spday[0]), { // Add date to index
                schedule: label,
                mapping: replacements,
              });
            } else { // Spans over multiple days
              // Loop through the days from the start to end date
              const d = new Date(spday[0]);
              while (d < new Date(spday[1])) {
                // Need to duplicate d as it is being reassigned
                this.index.set(Date.parse(d), { // Add the date to the index
                  schedule: label,
                  mapping: replacements,
                });
                d.setDate(d.getDate() + 1);
              }
            }
          }
          const makeArray = (len, value) =>
             Array.from(new Array(len), () => value);

          // Now parse the special schedules
          for (const rawschedule of days) {
            const day = rawschedule.split('\n');
            const scheduleName = day.shift(); // First line is the name of the schedule
            const schedule = [];
            let lastTime; // The last parsed time of a period
            for (const period of day) {
              // Format is periodName\tTime
              const [periodName, time] = period.split('\t');
              if (~periodName.indexOf('||')) { // Simultaneous periods are separated by ||
                const tracks = [];
                const nameTracks = periodName.split('||');
                const timeTracks = time.split('||');
                // Create an array of blank arrays for the passing periods
                const lastTrackTimes = makeArray(nameTracks.length, lastTime);
                // Loop through the two tracks
                for (let track = 0; track < nameTracks.length; track++) {
                  const trackPeriods = [];
                  // Each inner period is separated by a ||
                  const namePeriods = nameTracks[track].split('|');
                  const timePeriods = timeTracks[track].split('|');
                  for (let ip = 0; ip < namePeriods.length; ip++) {
                    const times = timePeriods[ip].split('-');
                    if (times[0] !== lastTrackTimes[track]) { // Passing period
                      trackPeriods.push({
                        type: 'period',
                        name: null,
                        start: lastTrackTimes[0],
                        end: times[0],
                      });
                    }
                    lastTrackTimes[track] = times[1];
                    trackPeriods.push({
                      type: 'period',
                      name: namePeriods[ip],
                      start: times[0],
                      end: times[1],
                    });
                  }
                  tracks.push(trackPeriods);
                  lastTime = Math.min(...lastTrackTimes);
                }
                // Now add the tracks to the schedule
                schedule.push({
                  type: 'group',
                  tracks,
                });
              } else {
                const times = time.split('-');
                if (lastTime && times[0] !== lastTime) { // Add the passing period
                  schedule.push({
                    type: 'period',
                    name: null,
                    start: lastTime,
                    end: times[0],
                  });
                }
                lastTime = times[1];
                schedule.push({
                  type: 'period',
                  name: periodName,
                  start: times[0],
                  end: times[1],
                });
              }
            }
            this.schedules.set(scheduleName, schedule);
          }
          resolve([this.index, this.schedules]);
        } else {
          reject(new Error(req.statusText));
        }
      };
      req.onerror = (err) => {
        reject(err);
      };
      req.send();
    });
  },
  /* Computes the schedule for the given day */
  for(day) {
    if (!this.index || !this.schedules) {
      // The schedules have not been populated yet
      throw new Error(
        'The bell schedule has not been retrieved yet. Please call refresh() first'
      );
    }

    // Logic taken from HarkerDev/bellschedule/script.js
    function getDateFromString(string, date) {
      let hour = +string.substring(0, string.indexOf(':'));
      const min = +string.substring(string.indexOf(':') + 1);
      if (hour < 7) hour += 12; // Assumes hours < 7 are PM and hours >= 7 are AM
      return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, min);
    }

    const d = new Date(day);
    d.setHours(0, 0, 0, 0);
    const special = this.index.get(d.getTime());
    if (special) { // There is a special schedule for the day
      const ret = JSON.parse(JSON.stringify(this.schedules.get(special.schedule))); // Deep clone
      // Now replace period names specified in the mapping and convert the times into date objects
      // Loop through the periods of the schedule
      for (const per of ret) {
        if (per.type === 'period') {
          per.start = getDateFromString(per.start, d);
          per.end = getDateFromString(per.end, d);
          if (special.mapping.has(per.name)) {
            per.name = special.mapping.get(per.name);
          }
        } else { // It's a group
          for (const track of per.tracks) {
            for (const p of track) {
              p.start = getDateFromString(p.start, d);
              p.end = getDateFromString(p.end, d);
              if (special.mapping.has(p.name)) {
                p.name = special.mapping.get(p.name);
              }
            }
          }
        }
      }
      // And return the schedule
      return {
        special: true,
        schedule: ret,
      };
    }
    // No special schedule for the day
    if (d.getDay() === 0 || d.getDay() === 6) { // A weekend
      // There is no school on weekends so return an empty array
      return {
        special: false,
        schedule: [],
      };
    }
    // Normal schedules are designated by O${day}
    const ret = JSON.parse(JSON.stringify(this.schedules.get(`O${d.getDay()}`))); // Deep clone
    // Now convert the time strings into dates
    for (const per of ret) {
      if (per.type === 'period') {
        per.start = getDateFromString(per.start, d);
        per.end = getDateFromString(per.end, d);
      } else { // It's a group
        for (const track of per.tracks) {
          for (const p of track) {
            p.start = getDateFromString(p.start, d);
            p.end = getDateFromString(p.end, d);
          }
        }
      }
    }
    return {
      special: false,
      schedule: ret,
      __proto__: {
        /* Yields all periods in a schedule (expanding groups) */
        * periods() {
          for (const per of this.schedule) {
            if (per.type === 'period') {
              yield per;
            } else { // A group
              for (const track of per.tracks) {
                for (const p of track) {
                  yield p;
                }
              }
            }
          }
        },
        /* Gets the period(s) at a specific time */
        * at(time) {
          for (const period of this.periods()) {
            if (period.start <= time && time < period.end) yield period;
          }
        },
        /* Gets the period after the given one */
        before(period) {
          let lastPeriod;
          for (const per of this.schedule) {
            if (per.type === 'period') {
              if (period === lastPeriod || ~lastPeriod.indexOf(period)) {
                return per;
              }
              lastPeriod = per;
            } else { // A group
              const a = [];
              for (const track of per.tracks) {
                let innerLast = lastPeriod;
                for (const p of track) {
                  if (period === innerLast || ~innerLast.indexOf(period)) {
                    return p;
                  }
                  innerLast = p;
                }
                a.push(innerLast);
              }
              lastPeriod = a;
            }
          }
          return null;
        },
        /* Gets the period after the given one */
        after(period) {
          let lastPeriod;
          for (const per of this.schedule) {
            if (per.type === 'period') {
              if (period === per) {
                return lastPeriod;
              }
              lastPeriod = per;
            } else { // A group
              const a = [];
              for (const track of per.tracks) {
                let innerLast = lastPeriod;
                for (const p of track) {
                  if (period === p) {
                    return innerLast;
                  }
                  innerLast = p;
                }
                a.push(innerLast);
              }
              lastPeriod = a;
            }
          }
          return null;
        },
      },
    };
  },
  /* Gets the period(s) at a specific time */
  at(time) {
    return this.for(time).at(time);
  },
};
