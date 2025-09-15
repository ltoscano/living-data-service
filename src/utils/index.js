export const copyPublicLink = async (publicUrl) => {
  const fullUrl = `${window.location.origin}${publicUrl}`;
  try {
    await navigator.clipboard.writeText(fullUrl);
    return { success: true, message: 'Link copied to clipboard!' };
  } catch (err) {
    alert(`Link: ${fullUrl}`);
    return { success: false, error: 'Failed to copy to clipboard' };
  }
};

export const getSortIcon = (sortBy, sortOrder, field) => {
  const { ArrowUpDown, ArrowUp, ArrowDown } = require('lucide-react');
  
  if (sortBy !== field) {
    return ArrowUpDown;
  }
  return sortOrder === 'asc' ? ArrowUp : ArrowDown;
};