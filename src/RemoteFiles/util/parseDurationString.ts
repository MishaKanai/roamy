function parseDurationString(durationStr: string) {
  const regex = /^(\d{2}):(\d{2}):(\d{2})\.(\d+)$/;
  const match = durationStr.match(regex);

  if (!match) {
    throw new Error("Invalid duration format: " + JSON.stringify(durationStr));
  }

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3], 10);
  const fractions = parseInt(match[4], 10) / Math.pow(10, match[4].length);

  // Convert the duration to a total number of seconds
  const totalSeconds = hours * 3600 + minutes * 60 + seconds + fractions;

  return {
    hours,
    minutes,
    seconds,
    fractions,
    totalSeconds,
  };
}

export default parseDurationString;
