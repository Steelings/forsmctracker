describe('buildDailySummary', () => {
  let runs = [
    { date: '2022-01-01', nether: 10, s1: 5, s2: 3, stronghold: 2, end: 1 },
    { date: '2022-01-02', nether: 7, s1: 4, s2: 2, stronghold: 1, end: 0 },
    { date: '2022-01-03', nether: 5, s1: 3, s2: 1, stronghold: 0, end: 0 },
  ];

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="val-nether-qty"></div>
      <div id="val-s1-qty"></div>
      <div id="val-s2-qty"></div>
      <div id="val-strong-qty"></div>
      <div id="val-end-qty"></div>
      <div id="val-finish-qty"></div>
      <div id="insight-resets-per-nether"></div>
      <div id="summary-runs"></div>
      <select id="summary-day"></select>
    `;
  });

  it('should update the dashboard cards', () => {
    buildDailySummary(runs);
    expect(document.getElementById('val-nether-qty').textContent).toBe('3');
    expect(document.getElementById('val-s1-qty').textContent).toBe('2');
    expect(document.getElementById('val-s2-qty').textContent).toBe('1');
    expect(document.getElementById('val-strong-qty').textContent).toBe('1');
    expect(document.getElementById('val-end-qty').textContent).toBe('0');
    expect(document.getElementById('val-finish-qty').textContent).toBe('0');
  });

  it('should calculate resets per nether', () => {
    buildDailySummary(runs);
    expect(document.getElementById('insight-resets-per-nether').textContent).toBe('2.0');
  });

  it('should populate the run history list', () => {
    buildDailySummary(runs);
    const runlist = document.getElementById('summary-runs').querySelector('.runlist');
    expect(runlist.querySelectorAll('.run').length).toBe(3);
    expect(runlist.querySelectorAll('.run')[0].textContent).toBe('2022-01-01 (3 runs)');
    expect(runlist.querySelectorAll('.run')[1].textContent).toBe('2022-01-02 (2 runs)');
    expect(runlist.querySelectorAll('.run')[2].textContent).toBe('2022-01-03 (1 run)');
  });
});