import { Link } from 'react-router-dom';
import { Calculator } from '../components/Calculator';
import { Faq, Prose } from '../components/ui';

export default function Biweekly() {
  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Biweekly Time Card Calculator</h1>
      <p className="mb-5 mt-2 max-w-3xl text-ink-700">Enter two weeks of shifts for a biweekly pay period. Overtime is checked separately for each workweek, and you can send or print the whole two-week timesheet.</p>
      <Calculator forcePeriod="biweekly" />
      <div className="max-w-3xl">
        <Prose>
          <h2>Why biweekly overtime is calculated week by week</h2>
          <p>Under the US Fair Labor Standards Act, overtime is based on a fixed <strong>7-day workweek</strong>, even when you're paid every two weeks. Your employer can't average two weeks together. Working 50 hours in week 1 and 30 hours in week 2 means <strong>10 overtime hours</strong>, even though the total is exactly 80.</p>
          <table>
            <thead><tr><th></th><th>Hours</th><th>Regular</th><th>Overtime</th></tr></thead>
            <tbody>
              <tr><td>Week 1</td><td>50</td><td>40</td><td>10</td></tr>
              <tr><td>Week 2</td><td>30</td><td>30</td><td>0</td></tr>
              <tr><td><strong>Pay period</strong></td><td><strong>80</strong></td><td><strong>70</strong></td><td><strong>10</strong></td></tr>
            </tbody>
          </table>
          <p>At $20 an hour that's 70 × $20 + 10 × $30 = <strong>$1,700</strong>, not the $1,600 you'd get by treating 80 hours as all regular. This calculator splits the period into week 1 and week 2 automatically.</p>
          <h2>Biweekly vs semi-monthly</h2>
          <p>Biweekly means every two weeks, 26 paychecks a year, always 14 days. Semi-monthly means twice a month (often the 15th and the last day), 24 paychecks a year, with periods of 13 to 16 days. For a semi-monthly period, use the weekly calculator for each workweek inside it.</p>
          <p>Need blank paper forms instead? Download a <Link to="/printable-timesheet/">printable biweekly timesheet</Link>.</p>
        </Prose>
        <Faq items={[
          ['Is overtime calculated on 80 hours for biweekly pay?', <p>Not under US federal rules. Overtime applies to hours over 40 in each 7-day workweek. Some states and contracts add daily overtime on top. Choose the rule that applies to you in the calculator.</p>],
          ['When does my biweekly workweek start?', <p>It's set by your employer, often Sunday or Monday. Change <em>Week starts on</em> under <em>More settings</em> so the two weeks line up with your pay period.</p>],
          ['How many hours is a full-time biweekly period?', <p>80 hours: two weeks of 40 hours.</p>],
        ]} />
      </div>
    </>
  );
}
