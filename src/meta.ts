import { SITE_NAME } from './site';

export type RouteMeta = {
  path: string;
  title: string;
  description: string;
  crumb: string; // breadcrumb / nav label
  index: boolean; // include in sitemap + indexable
  tool: boolean; // a tool page (WebApplication structured data)
  wide?: boolean; // full-width calculator layout
};

export const ROUTES: RouteMeta[] = [
  { path: '/', crumb: 'Time card calculator', index: true, tool: true, wide: true,
    title: `Time Card Calculator with Breaks & Overtime | ${SITE_NAME}`,
    description: 'Free time card calculator: enter clock-in and clock-out times, breaks and overtime rules to get weekly hours and pay. Print or send a signed timesheet PDF. No sign-up.' },
  { path: '/hours-calculator/', crumb: 'Hours calculator', index: true, tool: true,
    title: `Work Hours Calculator: Hours Between Two Times | ${SITE_NAME}`,
    description: 'Calculate hours worked between a start and end time, minus breaks. Handles overnight shifts and shows the result in hours and minutes and in decimal hours.' },
  { path: '/biweekly-time-card-calculator/', crumb: 'Biweekly time card calculator', index: true, tool: true, wide: true,
    title: `Biweekly Time Card Calculator (2 Weeks, Overtime per Week) | ${SITE_NAME}`,
    description: 'Add up two weeks of clock-in and clock-out times for a biweekly pay period. Overtime is calculated week by week, the way US federal rules require, not on an 80-hour total.' },
  { path: '/time-duration-calculator/', crumb: 'Time duration calculator', index: true, tool: true,
    title: `Time Duration Calculator: Time Between Two Dates & Times | ${SITE_NAME}`,
    description: 'Find the exact time between two dates and times in days, hours and minutes, or add and subtract hours and minutes from a time. Works across midnight and month ends.' },
  { path: '/overtime-calculator/', crumb: 'Overtime calculator', index: true, tool: true,
    title: `Overtime Calculator: Time and a Half & Double Time | ${SITE_NAME}`,
    description: 'Work out overtime pay from your hourly rate and hours worked. Time-and-a-half, double time and custom thresholds, with a clear breakdown of regular and overtime pay.' },
  { path: '/time-to-decimal/', crumb: 'Time to decimal', index: true, tool: true,
    title: `Minutes to Decimal Hours Converter & Chart | ${SITE_NAME}`,
    description: 'Convert hours and minutes to decimal hours for payroll, and back. Includes a printable minutes-to-decimal conversion chart from 1 to 60 minutes.' },
  { path: '/military-time-converter/', crumb: 'Military time converter', index: true, tool: true,
    title: `Military Time Converter & 24-Hour Time Chart | ${SITE_NAME}`,
    description: 'Convert standard 12-hour time to military (24-hour) time and back, with a full printable military time chart. Handy for reading time clocks and shift schedules.' },
  { path: '/printable-timesheet/', crumb: 'Printable timesheet', index: true, tool: true,
    title: `Free Printable Timesheet PDF: Weekly & Biweekly | ${SITE_NAME}`,
    description: 'Download a free blank weekly or biweekly timesheet PDF in Letter or A4 size, with columns for in and out times, breaks, totals and signatures. Or fill one in online.' },
  { path: '/privacy/', crumb: 'Privacy', index: true, tool: false,
    title: `Privacy: Your Hours Stay on Your Device | ${SITE_NAME}`,
    description: `How ${SITE_NAME} handles your data: timesheets are stored only in your browser, share links keep data out of server logs, and analytics are cookie-free.` },
  { path: '/view/', crumb: 'Shared timesheet', index: false, tool: false,
    title: `Shared Timesheet | ${SITE_NAME}`,
    description: 'A timesheet shared with you. Review hours and pay, add a supervisor signature and download the PDF.' },
  { path: '/saved/', crumb: 'My timesheets', index: false, tool: false,
    title: `My Saved Timesheets | ${SITE_NAME}`,
    description: 'Timesheets saved on this device. Reopen, duplicate, delete, back up or restore them.' },
];

export const NOT_FOUND: RouteMeta = {
  path: '/404', crumb: 'Not found', index: false, tool: false,
  title: `Page not found | ${SITE_NAME}`, description: 'This page does not exist.',
};

export function metaFor(pathname: string): RouteMeta {
  const p = pathname.endsWith('/') ? pathname : pathname + '/';
  return ROUTES.find((r) => r.path === p) ?? NOT_FOUND;
}

export const TOOL_LINKS = ROUTES.filter((r) => r.tool);
