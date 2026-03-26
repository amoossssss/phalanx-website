class DateHelper {
  static dateToDatetimeString = (dateString: Date | string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return (
      date.getFullYear() +
      '-' +
      (date.getMonth() + 1).toString().padStart(2, '0') +
      '-' +
      date.getDate().toString().padStart(2, '0') +
      ' ' +
      date.getHours().toString().padStart(2, '0') +
      ':' +
      date.getMinutes().toString().padStart(2, '0') +
      ':' +
      date.getSeconds().toString().padStart(2, '0')
    );
  };

  static dateToDateString = (dateString: Date | string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return (
      date.getFullYear() +
      '-' +
      (date.getMonth() + 1).toString().padStart(2, '0') +
      '-' +
      date.getDate().toString().padStart(2, '0')
    );
  };
}

export default DateHelper;
