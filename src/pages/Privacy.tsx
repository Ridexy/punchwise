import { Prose } from '../components/ui';
import { SITE_NAME } from '../site';

export default function Privacy() {
  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">Privacy</h1>
      <Prose>
        <p className="!mt-4">{SITE_NAME} is built so that your hours, pay and signature stay with you.</p>
        <h2>What we store, and where</h2>
        <ul>
          <li><strong>Your timesheets</strong> are saved in your browser's storage (IndexedDB) on your device. They are not uploaded to us. There are no accounts.</li>
          <li>Clearing your browser data deletes them. Use <em>My timesheets → Download backup</em> to keep a copy.</li>
          <li>PDFs and CSV files are created in your browser.</li>
        </ul>
        <h2>Share links</h2>
        <p>When you send a timesheet or a team link, the data is compressed into the part of the link after the <code>#</code>. Browsers do not send that part to the web server, so it doesn't reach our server or its logs. Anyone you give the link to can read the timesheet, so share it only with people you trust. Drawn signatures are never put into links. They only appear in PDFs you create.</p>
        <h2>Analytics</h2>
        <p>We may use Cloudflare Web Analytics to count page visits. It does not use cookies or local storage to track you, and it does not see the contents of your timesheets or share links.</p>
        <h2>Not advice</h2>
        <p>Totals and pay are estimates to help you check your hours. They are not payroll, tax or legal advice. Overtime rules vary by location, employer and contract.</p>
      </Prose>
    </>
  );
}
