import { Link } from 'react-router-dom';
import { Calculator } from '../components/Calculator';
import { Faq, Prose } from '../components/ui';
import { SITE_NAME } from '../site';

export default function Home() {
  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Free Time Card Calculator</h1>
      <p className="mb-5 mt-2 max-w-3xl text-ink-700">Enter your clock-in and clock-out times. Get your weekly hours, overtime and pay, then send or print a signed timesheet. Free, no sign-up, and your hours never leave your device.</p>
      <Calculator />
      <div className="max-w-3xl">
      <Prose>
        <h2 id="help" className="scroll-mt-20">How to use the time card calculator</h2>
        <ol>
          <li><strong>Pick the pay period.</strong> Weekly or biweekly. Use the arrows to move to the week you worked.</li>
          <li><strong>Enter each shift.</strong> Type the time you clocked in and out however you like: <em>9</em>, <em>930</em>, <em>9:30</em>, <em>5p</em> or <em>17:30</em>. The calculator shows how it read each time, and you can tap AM/PM to switch it. Worked a split shift? Tap <em>+ Add shift</em>. On your phone, <em>Clock in now</em> fills in the current time for you.</li>
          <li><strong>Add unpaid breaks.</strong> Tap 15, 30 or 60 minutes, or type any number. Breaks are subtracted from that day.</li>
          <li><strong>Add your rate</strong> (optional) and choose the overtime rule that applies to you to see your gross pay.</li>
          <li><strong>Send or print.</strong> Send the timesheet to your manager as a link or PDF, or download it, sign it and hand it in.</li>
        </ol>
        <h2>How hours are calculated</h2>
        <p>For each shift we subtract the clock-in time from the clock-out time. If the clock-out time is earlier than the clock-in time, the shift is treated as running past midnight, so a 10:00 PM to 6:00 AM night shift counts as 8 hours. Unpaid breaks are then subtracted from the day's total.</p>
        <p>Totals are shown two ways. <strong>Hours and minutes</strong> (8:45) is what you'd read off a clock. <strong>Decimal hours</strong> (8.75) is what most payroll systems need, because pay is calculated as decimal hours × hourly rate. See the <Link to="/time-to-decimal/">minutes to decimal chart</Link> for every conversion.</p>
        <h2>How overtime is calculated</h2>
        <p>Choose the rule that matches your job:</p>
        <ul>
          <li><strong>Over 40 hours a week:</strong> hours above 40 in a 7-day workweek are paid at 1.5×. This is the default under the US federal Fair Labor Standards Act for non-exempt employees. A biweekly period is checked week by week, not as 80 hours.</li>
          <li><strong>Daily and weekly:</strong> 1.5× after 8 hours in a day, 2× after 12 hours in a day, and 1.5× for any remaining hours above 40 a week. This is similar to the rules in California. Hours are never counted as overtime twice.</li>
          <li><strong>Custom:</strong> set your own weekly or daily thresholds and multipliers, for example 37.5 hours a week.</li>
        </ul>
        <p>Overtime law differs between countries, states and contracts, and some jobs are exempt. Use the result as a check, and confirm with your employer or local labor authority. To work out pay for a known number of overtime hours, use the <Link to="/overtime-calculator/">overtime calculator</Link>.</p>
        <h2>Rounding</h2>
        <p>Some employers round punches to the nearest 5, 6, 10 or 15 minutes. If yours does, pick the same rounding under <em>More settings</em> so your totals match your pay stub. Rounding is off by default, so your exact times are used.</p>
        <h2>Your data stays with you</h2>
        <p>{SITE_NAME} runs in your browser. Timesheets are saved on this device, not on our servers, and there is no account to create. When you send a timesheet, the hours travel inside the link itself. Read the <Link to="/privacy/">privacy page</Link> for details.</p>
      </Prose>
      <Faq items={[
        ['How do I calculate hours worked on a time card?', <p>Subtract the clock-in time from the clock-out time for each shift, subtract unpaid breaks, then add up the days. For example, 8:30 AM to 5:15 PM with a 30-minute lunch is 8 hours 45 minutes minus 30 minutes, which is 8:15 or 8.25 hours.</p>],
        ['Does the calculator handle overnight shifts?', <p>Yes. If you clock out at a time earlier than you clocked in, the shift is counted as crossing midnight. The hours are counted on the day the shift started.</p>],
        ['How do I convert minutes to decimal hours?', <p>Divide the minutes by 60. 15 minutes is 0.25 hours, 30 minutes is 0.5 and 45 minutes is 0.75. The calculator shows every total in decimal hours automatically.</p>],
        ['Can I send my timesheet to my manager?', <p>Yes. Tap <em>Send timesheet</em> to share a link by WhatsApp, text or email, or send the PDF. Your manager can open it in any browser, add their signature and download it. No account is needed on either side.</p>],
        ['Is this calculator free?', <p>Yes. The calculator, PDF timesheets and sharing are free, with no sign-up.</p>],
        ['Is the pay figure my take-home pay?', <p>No. It is gross pay before taxes and deductions. Your actual paycheck will be lower after withholding.</p>],
        ['Where are my timesheets saved?', <p>In your browser's storage on this device. They are not uploaded. If you clear your browser data they will be deleted, so download a PDF or a backup from <Link to="/saved/">My timesheets</Link>.</p>],
      ]} />
      <section className="mt-10">
        <h2 className="mb-3 text-2xl font-bold">More free tools</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ['/hours-calculator/', 'Work hours calculator', 'Hours between two times for a single shift.'],
            ['/biweekly-time-card-calculator/', 'Biweekly time card calculator', 'Two weeks, with overtime checked week by week.'],
            ['/time-duration-calculator/', 'Time duration calculator', 'Time between two dates and times.'],
            ['/overtime-calculator/', 'Overtime calculator', 'Time-and-a-half and double-time pay.'],
            ['/time-to-decimal/', 'Time to decimal', 'Minutes to decimal hours, with a chart.'],
            ['/military-time-converter/', 'Military time converter', '12-hour to 24-hour time and back.'],
            ['/printable-timesheet/', 'Printable timesheet', 'Blank weekly or biweekly PDF.'],
          ].map(([to, t, d]) => (
            <Link key={to} to={to} className="rounded-2xl bg-white p-4 ring-1 ring-ink-300/50 hover:ring-brand-500">
              <span className="block font-bold text-ink-900">{t}</span>
              <span className="block text-sm text-ink-500">{d}</span>
            </Link>
          ))}
        </div>
      </section>
      </div>
    </>
  );
}
