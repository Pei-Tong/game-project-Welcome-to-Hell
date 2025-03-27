// Helper function to get random color for platforms
export const getRandomColor = () => {
  // Platform colors - safe, muted colors that work well with the game
  const platformColors = [
    '#4b7bec',  // Blue
    '#26de81',  // Green
    '#fd9644',  // Orange
    '#a55eea',  // Purple
    '#778ca3',  // Gray
    '#f7b731',  // Yellow
  ];
  
  return platformColors[Math.floor(Math.random() * platformColors.length)];
}; 