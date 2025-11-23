// A small sample of the ATNF Pulsar Catalogue
// Data source: https://www.atnf.csiro.au/research/pulsar/psrcat/
// The full catalogue has ~2600 pulsars. We're using a small subset for development.
// Key parameters:
// JNAME: Pulsar name
// ASSOC: Associated object (e.g., Supernova Remnant, Globular Cluster)
// P0: Pulsation period (in seconds)
// DM: Dispersion Measure (in cm^-3 pc)
// GL: Galactic Longitude (in degrees)
// GB: Galactic Latitude (in degrees)
// DIST: Best-guess distance from the Sun (in kpc)

export const pulsarData = [
  {
    "JNAME": "J0002+6216",
    "ASSOC": "SNR G117.7+0.6",
    "P0": 0.1126,
    "DM": 227.0,
    "GL": 117.6,
    "GB": -0.4,
    "DIST": 2.0
  },
  {
    "JNAME": "J0437-4715",
    "ASSOC": "",
    "P0": 0.00575,
    "DM": 2.64,
    "GL": 253.39,
    "GB": -42.03,
    "DIST": 0.156
  },
  {
    "JNAME": "B0531+21",
    "ASSOC": "Crab",
    "P0": 0.0334,
    "DM": 56.77,
    "GL": 184.56,
    "GB": -5.78,
    "DIST": 2.0
  },
  {
    "JNAME": "B0833-45",
    "ASSOC": "Vela",
    "P0": 0.0893,
    "DM": 67.99,
    "GL": 263.55,
    "GB": -2.79,
    "DIST": 0.287
  },
  {
    "JNAME": "J1846-0258",
    "ASSOC": "SNR KES 75",
    "P0": 0.326,
    "DM": 297.0,
    "GL": 28.7,
    "GB": 0.1,
    "DIST": 6.0
  },
  {
    "JNAME": "B1937+21",
    "ASSOC": "",
    "P0": 0.00155,
    "DM": 71.02,
    "GL": 57.5,
    "GB": 0.29,
    "DIST": 3.6
  }
];
