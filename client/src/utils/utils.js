export const convertUTCToLocal = (dateString) => {
  const date = new Date(dateString);
  if (!dateString) {
    return ' ';
}

  const localTime = new Date(date.getTime() + (7 * 60 * 60 * 1000)); // UTC+7
  return localTime.toISOString().slice(0, 16).replace('T', ' ');
};

export const formatProjectDates = (projects) => {
  return projects.map(project => {
    return {
      ...project,
      last_update: convertUTCToLocal(project.last_update)
    };
  });
};

const getStatus = (process) => {
  const { userName, remainingTime } = process;

  if (userName && remainingTime !== null) {
    return {
      status: `Checked out by ${userName}`,
      remainingTime: remainingTime,
      color:
        remainingTime >= 7
          ? "#4CAF50"
          : remainingTime < 3
          ? "#F44336"
          : "#FFEB3B",
    };
  } else {
    return {
      status: ' ',
      remainingTime: null,
      color: null,
    };
  }
};

export const formatProcessInfos = (processes) => {
  return processes.map(process => {
    const statusInfo = getStatus(process);

    return {
      ...process,
      status: statusInfo.status,
      remainingTime: statusInfo.remainingTime,
      statusColor: statusInfo.color,
      last_update: convertUTCToLocal(process.last_update),
      children: formatProcessInfos(process.children || [])
    };
  });
};
