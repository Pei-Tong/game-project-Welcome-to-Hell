# Mobile Game Project - Stable Version

This is the stable version of a mobile game project, preserved from the 22:11 commit. It features a vertically scrolling platform game with various gameplay elements.

## Game Features

- **Dynamic Platforming**: Navigate through an endless series of platforms that scroll vertically
- **Multiple Platform Types**:
  - Regular platforms
  - Springs that bounce the player higher
  - Treadmills that move the player horizontally
  - Spikes that damage the player
- **Health System**: Player has 10 lives that can be lost through various hazards
- **Falling Fireballs**: Dodge fireballs that fall from the top of the screen
- **Score System**: Earn points based on survival time
- **Responsive Controls**: Move left and right with on-screen buttons

## Technical Details

- Built with React Native and Expo
- Physics powered by Matter.js
- Custom collision detection system
- Dynamic entity generation

## Controls

- Left and right buttons control horizontal movement
- Landing on springs causes the player to bounce higher
- Regular platforms provide healing
- Spikes cause damage
- Treadmills move the player in their direction

## Setup Instructions

1. Clone the repository
2. Install dependencies: `npm install`
3. Run the game: `npm start` or `expo start`

## Version Information

This is the stable version from the 22:11 commit, which includes the following improvements:
- Slow bounce on springs with healing
- Healing on platforms
- Damage on spikes
- Fixed boundary detection
- Increased platform gaps for better gameplay

## Credits

- Original game concept and implementation by the Mobile Game Development Team
- Physics engine: Matter.js
- Game engine: React Native Game Engine

## License

This project is licensed under the MIT License - see the LICENSE file for details.