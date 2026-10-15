<script>
  let { name, className = 'w-5 h-5', stroke = 1.6 } = $props();
  
  const paths = {
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" />',
    badge: '<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" /><circle cx="12" cy="12" r="3" />',
    person_search: '<circle cx="10" cy="7" r="4" /><path d="M10 15c-3.1 0-6 1.4-6 4v1h12v-1c0-1.2.5-2.3 1.4-3.1" /><circle cx="18" cy="18" r="3" /><path d="m22 22-1.5-1.5" />',
    task_alt: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" />',
    calendar_month: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />',
    warning: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />',
    school: '<path d="M14 22v-4a2 2 0 1 0-4 0v4" /><path d="m18 10 3.43-1.14a2 2 0 0 0 1.12-2.36l-1.57-4.72A2 2 0 0 0 18.62 1H5.38a2 2 0 0 0-1.89 1.28L1.92 7a2 2 0 0 0 1.12 2.36L6 10" /><path d="M10 22V10M14 22V10M18 22V10M6 22V10" />',
    menu: '<line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />',
    close: '<line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />',
    account_balance: '<path d="M3 21h18M3 10h18M5 10v11M9 10v11M15 10v11M19 10v11M12 2 2 7h20L12 2z"/>',
    construction: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    view_kanban: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 7v7M12 7v4M16 7v9"/>',
    gavel: '<path d="m14 13-7.5 7.5c-.83.83-2.17.83-3 0a2.12 2.12 0 0 1 0-3L11 10M16 16l6-6M8 8l6-6M9 7l8 8M21 11l-8-8"/>',
    handshake: '<path d="m11 17 2 2a1 1 0 0 0 1.4 0l6.6-6.6a2 2 0 0 0 0-2.8l-3.4-3.4a2 2 0 0 0-2.8 0L12 9M13 7l-2-2a1 1 0 0 0-1.4 0L3 11.6a2 2 0 0 0 0 2.8l3.4 3.4a2 2 0 0 0 2.8 0L12 15M2 13l3 3M19 8l3 3"/>',
    bar_chart: '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/><line x1="2" y1="20" x2="22" y2="20"/>',
    public: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    chevron_right: '<polyline points="9 18 15 12 9 6"/>',
    chevron_left: '<polyline points="15 18 9 12 15 6"/>',
    arrow_forward: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
    arrow_upward: '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>',
    arrow_downward: '<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    add: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    check_circle: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    hourglass_top: '<path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/>',
    description: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    visibility: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    visibility_off: '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    verified: '<path d="M12 2l3.09 3.09 4.37.58 1.46 4.19L23 12.5l-2.08 2.64.58 4.37-4.19 1.46L14.67 23 12 20.92 9.33 23l-2.64-2.03-4.19-1.46.58-4.37L1 12.5l2.08-2.64-.58-4.19 4.19-1.46L9.33 1 12 2z"/><polyline points="9 12 11 14 15 10"/>',
    monetization_on: '<circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8M12 6v12"/>',
    alarm: '<circle cx="12" cy="13" r="8"/><polyline points="12 9 12 13 14 15"/><path d="M5 3 2 6M22 6l-3-3M6.38 18.7 4 21M17.64 18.67 20 21"/>',
    autorenew: '<path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>',
    event_busy: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="15" y1="14" x2="9" y2="20"/><line x1="9" y1="14" x2="15" y2="20"/>',
    verified_user: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    attach_money: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    trending_up: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
    schedule: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    calendar_today: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    satellite_alt: '<path d="M13 7 9 3 5 7l4 4"/><path d="m17 11 4 4-4 4-4-4"/><path d="m8 12 4 4"/><path d="m16 8-4-4"/><circle cx="12" cy="12" r="2"/>',
    add_photo_alternate: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>',
    payments: '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>',
    receipt_long: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z"/><path d="M8 7h8M8 11h8M8 15h5"/>',
    water_drop: '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>',
    science: '<path d="M6 22h12M10 2v5.5a4.5 4.5 0 0 1-1 3L5 18a2 2 0 0 0 1.5 3h11a2 2 0 0 0 1.5-3l-4-7.5a4.5 4.5 0 0 1-1-3V2M8.5 2h7"/>',
    location_on: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    add_a_photo: '<path d="M3 7h3l2-3h7l2 3h4v13H3z"/><circle cx="12" cy="13" r="3"/><path d="M19 2v6M16 5h6"/>',
    arrow_back: '<path d="M19 12H5m7-7-7 7 7 7"/>',
    assignment_turned_in: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3h6M8 12l3 3 5-5"/>',
    beach_access: '<path d="M3 15c4-8 12-8 18 0-3-1-5 0-6 2-2-2-4-2-6 0-1-2-3-3-6-2Z"/><path d="M12 14v7M4 21h16"/>',
    check: '<path d="m4 12 5 5L20 6"/>',
    code: '<path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-4 16"/>',
    corporate_fare: '<rect x="3" y="8" width="7" height="13" rx="1"/><rect x="10" y="3" width="11" height="18" rx="1"/><path d="M6 11h1m-1 4h1m6-8h1m3 0h1m-5 4h1m3 0h1m-5 4h1m3 0h1"/>',
    engineering: '<path d="M3 21h18M5 18v-6l7-4 7 4v6M9 18v-5h6v5M8 5l4-2 4 2"/><circle cx="12" cy="7" r="1"/>',
    error: '<circle cx="12" cy="12" r="10"/><path d="M12 7v6m0 4h.01"/>',
    fact_check: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 8h4m-4 4h4m-4 4h4m3-4 2 2 3-4"/>',
    flight_takeoff: '<path d="M2 19h20M3 8l3-1 4 4 7-2 3 1-10 5-4-1-3-6Z"/>',
    groups: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2"/><path d="M2 20v-2c0-3 3-5 7-5s7 2 7 5v2H2Zm15-7c3 0 5 2 5 5v2h-4"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="2"/><path d="m3 17 5-5 4 4 4-5 5 5"/>',
    image_not_supported: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m3 3 18 18M7 15l2-2 3 3m3-3 2-2 4 4"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 11v6m0-10h.01"/>',
    lock_reset: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 7-3m2 0h3v3M12 14v3"/>',
    my_location: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>',
    notification_important: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 9h18c0-1-3-2-3-9ZM10 21h4"/><path d="M12 7v4m0 3h.01"/>',
    pending_actions: '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4m8-4v4M4 10h16m-8 3v3l2 1"/>',
    person_add: '<circle cx="9" cy="8" r="4"/><path d="M2 21v-2c0-3 3-5 7-5s7 2 7 5v2H2Zm17-10v8m-4-4h8"/>',
    rate_review: '<path d="M4 4h16v13H9l-5 4V4Z"/><path d="m8 12 2 2 5-5m-7-1h8"/>',
    sanitizer: '<path d="M8 8h8l2 3v10H6V11l2-3Zm2 0V5h4v3M9 3h7m-1 0 2 2"/><path d="M12 13v5m-2-2.5h4"/>',
    send: '<path d="m22 2-7 20-4-9-9-4 20-7ZM11 13l11-11"/>',
    trending_down: '<path d="m2 5 8 8 4-4 8 8m-6 0h6v-6"/>',
    work: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V4h8v3M3 13h18m-11-1v3h4v-3"/>',
    work_outline: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V4h8v3M3 13h18"/>'
  };
</script>

<svg
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width={stroke}
  stroke-linecap="round"
  stroke-linejoin="round"
  class={className}
  aria-hidden="true"
>
  {@html paths[name] || ''}
</svg>
