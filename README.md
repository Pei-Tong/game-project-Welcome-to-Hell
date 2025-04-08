# NS-Shaft: Welcome to Hell

This is a stable version of our NS-Shaft inspired mobile game project, preserved from the 22:11 commit. It features a vertically scrolling platform game with various gameplay elements set in a hellish theme.

## Game Demo

Below is a demonstration of the NS-Shaft: Welcome to Hell gameplay:

<!-- Option 1: Direct GIF embed -->
<!-- ![Gameplay Demo](assets/gameplay-demo.gif) -->

<!-- Option 2: YouTube video link -->
<!-- [![Gameplay Demo](https://img.youtube.com/vi/YOUR_VIDEO_ID/0.jpg)](https://www.youtube.com/watch?v=YOUR_VIDEO_ID) -->

<!-- Option 3: GitHub video file reference -->
<!-- For GitHub video file, upload your video to the repository and reference it like this: -->
<!-- 
<video width="640" height="360" controls>
  <source src="assets/gameplay-demo.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>
-->

<!-- To implement any of these options, remove the comments and replace the placeholder paths with your actual video file paths or IDs -->

## Game Concept

NS-Shaft: Welcome to Hell is based on the classic NS-Shaft game concept, where players must navigate downward through a series of platforms while avoiding hazards. In our version, the player descends through the layers of hell, facing increasingly challenging obstacles.

## Game Features

- **Dynamic Platforming**: Navigate through an endless series of hellish platforms that scroll vertically
- **Multiple Platform Types**:
  - Regular platforms that provide sanctuary
  - Demonic springs that bounce the player higher
  - Hellish treadmills that move the player horizontally
  - Fiery spikes that damage the player
- **Health System**: Player has 10 lives that can be lost through various infernal hazards
- **Falling Fireballs**: Dodge fireballs that fall from the top of the screen
- **Score System**: Earn points based on survival time in hell
- **Responsive Controls**: Move left and right with on-screen buttons

## Technical Details

- Built with React Native and Expo
- Physics powered by Matter.js
- Custom collision detection system
- Dynamic entity generation

## Controls

- Left and right buttons control horizontal movement
- Landing on springs causes the player to bounce higher (with healing effect)
- Regular platforms provide healing (brief sanctuary)
- Spikes cause damage (hellish punishment)
- Treadmills move the player in their direction (the unstable nature of hell)

## Setup Instructions

1. Clone the repository
2. Install dependencies: `npm install`
3. Run the game: `npm start` or `expo start`

## Version Information

This is the stable version from the 22:11 commit, which includes the following improvements:
- Slow bounce on springs with healing
- Healing on platforms (sanctuary effect)
- Damage on spikes (increased challenge)
- Fixed boundary detection
- Increased platform gaps for better gameplay

## Visual Theme

The game features a dark, fiery aesthetic with:
- Hellish background with flames
- Demonic imagery
- Red and black color scheme
- Infernal obstacles

## Credits

- Inspired by the classic NS-Shaft game
- Original "Welcome to Hell" concept and implementation by the Mobile Game Development Team
- Physics engine: Matter.js
- Game engine: React Native Game Engine

## License

This project is licensed under the MIT License - see the LICENSE file for details.