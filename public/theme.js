const toggleTheme = (forceSet) => {
  const cl = document.documentElement.classList;
  forceSet ||= cl.contains("dark") ? "light" : "dark";
  cl.remove("dark", "light");
  cl.add(forceSet);

  localStorage.setItem("theme", forceSet);
};

const getTheme = () => {
  const currentTheme = localStorage.getItem("theme");
  if (currentTheme) {
    return currentTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)") ? "dark" : "light";
};

window.toggleTheme = toggleTheme;

const preferredTheme = getTheme() === "dark" ? "dark" : "light";
toggleTheme(preferredTheme);

document.addEventListener("astro:page-load", () => {
  toggleTheme(getTheme());
});
