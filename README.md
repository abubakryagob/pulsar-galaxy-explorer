# 🌌 Pulsar Galaxy Explorer

An interactive 3D visualization of pulsars in our galaxy with real astronomical data, authentic audio frequencies, and actual pulsar emission videos.

![Pulsar Galaxy Explorer](https://img.shields.io/badge/WebGL-Three.js-brightgreen) ![Audio](https://img.shields.io/badge/Audio-Web_Audio_API-blue) ![Data](https://img.shields.io/badge/Data-4342_Pulsars-orange)

## ✨ Features

### 🎯 **Scientific Accuracy**
- **4,342 real pulsars** from astronomical catalogs
- **Authentic galactic coordinates** positioning
- **Real pulsar periods** converted to audible frequencies
- **Point-source representation** (how pulsars actually appear from Earth)

### 🎵 **Audio Integration**
- **Real-time audio synthesis** matching actual pulsar frequencies
- **Period-to-frequency conversion** (milliseconds → Hz)
- **Interactive sound control** with mute/unmute toggle

### 📹 **Video Integration**
- **Real pulsar emission video** (`PulsarWithProfile.480p.mp4`)
- **Speed-matched playback** adjusted to each pulsar's frequency
- **Separate video panel** for authentic visualization while maintaining scientific accuracy

### 🎨 **Enhanced Visual Effects**
- **Particle effects** for selected pulsars
- **Bloom post-processing** for realistic glow
- **Color-coded by rotation speed**:
  - 🔵 **Blue**: Fast pulsars (< 0.1s period)
  - 🟢 **Cyan**: Medium pulsars (0.1s - 1.0s period)  
  - 🟣 **Purple**: Slow pulsars (> 1.0s period)

### 🔧 **Interactive Controls**
- **Click any pulsar** to view detailed information
- **Filter by speed**: All, Fast, or Slow pulsars
- **Audio toggle** with visual feedback
- **Orbital camera controls** for 3D navigation

## 🚀 Quick Start

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/pulsar-galaxy-explorer.git
   cd pulsar-galaxy-explorer
   ```

2. **Start a local server**:
   ```bash
   python3 -m http.server 8000
   ```
   *Or use any HTTP server (Node.js, Apache, nginx, etc.)*

3. **Open in browser**:
   ```
   http://localhost:8000/
   ```

## 📁 Project Structure

```
pulsar-galaxy-explorer/
├── index.html                  # Entry point
├── assets/
│   ├── css/                    # Stylesheets
│   ├── js/                     # Application logic
│   ├── data/                   # Astronomical data
│   └── media/                  # Videos and images
├── scripts/                    # Data processing scripts
└── README.md                   # Documentation
```

## 🎮 How to Use

1. **Navigate**: Use mouse to orbit, zoom, and pan around the galaxy
2. **Select Pulsars**: Click on any point of light to see detailed information
3. **Listen**: Selected pulsars play audio at their real frequencies
4. **Watch**: Real pulsar video plays in the info panel at matched speed
5. **Filter**: Use buttons to show different pulsar types
6. **Audio Control**: Toggle sound on/off with the speaker button

## 🔬 Technical Details

### **Technologies Used**
- **Three.js v0.163.0**: 3D rendering engine
- **Web Audio API**: Real-time audio synthesis
- **HTML5 Video**: Pulsar emission visualization
- **WebGL**: Hardware-accelerated graphics

### **Data Processing**
- Source: Astronomical pulsar catalogs
- Format: CSV → JavaScript array
- Validation: Coordinates, periods, distances
- Statistics: Fast/Medium/Slow categorization

### **Performance Optimizations**
- Chunked loading for 4,000+ objects
- Distance-based culling
- LOD (Level of Detail) for far objects
- Efficient particle systems

## 🌟 Scientific Background

**Pulsars** are rapidly rotating neutron stars that emit beams of radiation. As they spin, these beams sweep across space like lighthouse beams. When a beam points toward Earth, we detect a pulse of radio waves.

- **Period Range**: 1.4ms to 23 seconds
- **Discovery**: First found in 1967
- **Formation**: Supernova remnants
- **Applications**: GPS-like navigation for spacecraft

## 🎯 Educational Value

This visualization helps understand:
- **Scale of our galaxy** (50,000+ light-years across)
- **Pulsar distribution** throughout the Milky Way
- **Relationship between rotation and age**
- **Real astronomical measurement techniques**

## 🤝 Contributing

Contributions welcome! Areas for improvement:
- Additional astronomical objects (black holes, quasars)
- VR/AR support
- More detailed pulsar information
- Performance optimizations
- Mobile responsiveness

## 📊 Data Credits

Pulsar data sourced from:
- **ATNF Pulsar Catalogue**
- **Jodrell Bank Observatory**
- **Various radio astronomy surveys**

Video content:
- **Real pulsar emission profiles**
- **Radio telescope observations**

## 📜 License

MIT License - feel free to use for educational and research purposes.

---

*Made with ❤️ for astronomy education and scientific visualization*
