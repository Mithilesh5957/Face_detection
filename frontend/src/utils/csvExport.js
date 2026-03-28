export const downloadCSV = (data, filename) => {
  if (!data || data.length === 0) return;

  // Extract headers
  const headers = Object.keys(data[0]);

  // Convert objects to CSV string
  const csvContent = [
    headers.join(','),
    ...data.map((row) => 
      headers.map((fieldName) => JSON.stringify(row[fieldName] || '')).join(',')
    )
  ].join('\n');

  // Create a blob and download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};
