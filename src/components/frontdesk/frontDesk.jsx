// import React, { useState, useEffect, useRef } from 'react';
// import StreamingAvatar, { AvatarQuality, StreamingEvents } from '@heygen/streaming-avatar';

// const AvatarComponent = () => {
//   const [avatar, setAvatar] = useState(null);
//   const [text, setText] = useState('');
//   const [isSessionActive, setIsSessionActive] = useState(false);
//   const [error, setError] = useState('');
//   const videoRef = useRef(null);

//   // Replace with your HeyGen API key or trial token
//   const HEYGEN_TOKEN = 'ENTER_YOUR_HEYGEN_TOKEN_HERE';
//   // Use a public avatar ID (available at labs.heygen.com/interactive-avatar)
//   const AVATAR_ID = 'Monica-20220818';
//   const VOICE_ID = '2d5b0e6cf36f460aa7fc47e3eee4ba54';

//   useEffect(() => {
//     if (avatar && videoRef.current) {
//       // Attach the avatar stream to the video element
//       videoRef.current.srcObject = avatar.stream;
//     }
//   }, [avatar]);

//   const startAvatar = async () => {
//     try {
//       const streamingAvatar = new StreamingAvatar({ token: HEYGEN_TOKEN });

//       // Set up event listeners
//       streamingAvatar.on(StreamingEvents.STREAM_READY, (event) => {
//         setAvatar(streamingAvatar);
//         setIsSessionActive(true);
//         setError('');
//       });

//       streamingAvatar.on(StreamingEvents.STREAM_DISCONNECTED, () => {
//         setIsSessionActive(false);
//         setAvatar(null);
//         setError('Stream disconnected');
//       });

//       streamingAvatar.on(StreamingEvents.AVATAR_START_TALKING, () => {
//         console.log('Avatar started talking');
//       });

//       await streamingAvatar.createStartAvatar({
//         quality: AvatarQuality.High,
//         avatarName: AVATAR_ID,
//         voice: { voiceId: VOICE_ID, rate: 1.0 },
//       });

//     } catch (err) {
//       setError('Failed to start avatar: ' + err.message);
//     }
//   };

//   const stopAvatar = async () => {
//     if (avatar) {
//       try {
//         await avatar.stopAvatar();
//         setIsSessionActive(false);
//         setAvatar(null);
//       } catch (err) {
//         setError('Failed to stop avatar: ' + err.message);
//       }
//     }
//   };

//   const handleSpeak = async (e) => {
//     e.preventDefault();
//     if (!avatar || !text.trim()) return;

//     try {
//       await avatar.speak({
//         text: text,
//         task_type: 'TALK',
//         taskMode: 'SYNC',
//       });
//       setText('');
//     } catch (err) {
//       setError('Failed to make avatar speak: ' + err.message);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
//       <h1 className="text-3xl font-bold text-gray-800 mb-6">HeyGen Interactive Avatar</h1>
      
//       <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl">
//         {error && (
//           <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
//             {error}
//           </div>
//         )}

//         <div className="flex justify-center mb-4">
//           <video
//             ref={videoRef}
//             autoPlay
//             className="w-full h-96 rounded-lg bg-black"
//             style={{ display: isSessionActive ? 'block' : 'none' }}
//           />
//           {!isSessionActive && (
//             <div className="w-full h-96 bg-gray-200 rounded-lg flex items-center justify-center">
//               <p className="text-gray-500">Avatar not active</p>
//             </div>
//           )}
//         </div>

//         <div className="flex space-x-4 mb-4">
//           <button
//             onClick={startAvatar}
//             disabled={isSessionActive}
//             className={`flex-1 py-2 px-4 rounded-lg text-white font-semibold ${
//               isSessionActive ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
//             }`}
//           >
//             Start Avatar
//           </button>
//           <button
//             onClick={stopAvatar}
//             disabled={!isSessionActive}
//             className={`flex-1 py-2 px-4 rounded-lg text-white font-semibold ${
//               !isSessionActive ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
//             }`}
//           >
//             Stop Avatar
//           </button>
//         </div>

//         <form onSubmit={handleSpeak} className="flex space-x-2">
//           <input
//             type="text"
//             value={text}
//             onChange={(e) => setText(e.target.value)}
//             placeholder="Type something for the avatar to say"
//             className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//             disabled={!isSessionActive}
//           />
//           <button
//             type="submit"
//             disabled={!isSessionActive || !text.trim()}
//             className={`py-2 px-4 rounded-lg text-white font-semibold ${
//               !isSessionActive || !text.trim() ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
//             }`}
//           >
//             Speak
//           </button>
//         </form>
//       </div>
//     </div>
//   );
// };

// export default AvatarComponent;