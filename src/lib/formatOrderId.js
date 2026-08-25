export const formatOrderId = (id) => {
  if (!id) return '#N/A';
  const hex = id.replace(/-/g, '').slice(0, 6);
  const num = parseInt(hex, 16) % 100000;
  return `#${num.toString().padStart(5, '0')}`;
};

export const formatMessageWithOrderId = (message) => {
  if (!message) return message;
  // Replace UUID pattern (8-4-4-4-12) with formatted order ID
  return message.replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, (match) => formatOrderId(match));
};