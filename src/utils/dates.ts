export const getMonthName = (monthNumber: number) => {
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return monthNames[monthNumber - 1];
};

export const displayDate = (dateNumber: string) => {
  const [year, month, day] = dateNumber.split("-").map((y) => parseInt(y));

  return `${getMonthName(month)} ${year}`;
};
