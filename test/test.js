/* global bellSchedule */
/* eslint-disable no-console */

const test = require('tape');

test('Error when schedule not fetched yet', (ft) => {
  ft.plan(2);
  try {
    bellSchedule.for(new Date());
    ft.fail('for function did not throw an error');
  } catch (e) {
    ft.pass('for function errored');
  }
  try {
    bellSchedule.at(new Date()).next();
    ft.fail('at function did not throw an error');
  } catch (e) {
    ft.pass('at function errored');
  }
  test('Refresh returns', (t) => {
    t.plan(2);
    bellSchedule.refresh().then(([index, schedules]) => {
      t.ok(index, 'Index defined');
      t.ok(schedules, 'Schedules defined');
    });
    test('For function works', (st) => {
      st.plan(10);
      const date = new Date();
      for (let i = 0; i < 10; i++) {
        const { special, schedule } = bellSchedule.for(date);
        console.log(date.toString(), special, schedule);
        if (date.getDay() === 0 || date.getDay() === 6) {
          st.equal(schedule.length, 0, 'Schedule length is 0');
        } else {
          st.notEqual(schedule.length, 0, 'Schedule length is not 0');
        }
        date.setDate(date.getDate() - 1);
      }
    });
    test('At function works', (st) => {
      st.plan(2);
      // Get the last Monday
      const date = new Date();
      date.setDate(date.getDate() + (date.getDay() === 0 ? -6 : 1 - date.getDay()));
      // At 11:45, there should be two periods
      date.setHours(11, 45, 0, 0);
      console.log(`Date is ${date.toString()}`);
      st.equal([...bellSchedule.at(date)].length, 2, 'Number of periods is 2');

      // At 1:50, it should be a passing period
      date.setHours(13, 50);
      console.log(`Date is now ${date.toString()}`);
      st.equal(bellSchedule.at(date).next().value.name, null, 'Is a Passing period');
    });
    test('Next function works', (st) => {
      st.plan(1);
      // Again, last Monday
      const date = new Date();
      date.setDate(date.getDate() + (date.getDay() === 0 ? -6 : 1 - date.getDay()));
      // Now get the schedule for that date
      const sch = bellSchedule.for(date);
      const period1 = sch.schedule[0];
      const period2 = sch.schedule[1];
      st.equal(sch.after(period1), period2, 'Second period comes after the first one');
    });
    test('Before function works', (st) => {
      st.plan(1);
      // Again, last Monday
      const date = new Date();
      date.setDate(date.getDate() + (date.getDay() === 0 ? -6 : 1 - date.getDay()));
      // Now get the schedule for that date
      const sch = bellSchedule.for(date);
      const period1 = sch.schedule[0];
      const period2 = sch.schedule[1];
      st.equal(sch.before(period2), period1, 'Second period comes after the first one');
    });
  });
});
