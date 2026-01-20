;(function () {
  const pref = localStorage.getItem('theme-preference')
  const theme = pref ? JSON.parse(pref) : 'System'
  const isDark =
    theme === 'Dark' ||
    (theme === 'System' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)
  if (isDark) document.documentElement.classList.add('dark')
})()
