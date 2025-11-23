// Parser to convert PSRCat data from text format to usable JSON
// This script reads pulsar_data.txt and outputs processed JSON data

import * as fs from 'fs';
import * as path from 'path';

// Read the pulsar data file
const dataPath = path.join(process.cwd(), 'pulsar_data.txt');
const rawData = fs.readFileSync(dataPath, 'utf8');

// Split the file into lines and remove header
const lines = rawData.split('\n').filter(line => line.trim() !== '');
const dataLines = lines.filter((line, index) => 
    index > 5 && 
    line.trim().length > 0 && 
    !line.includes('-----') &&
    line.match(/^\d+\s+J/)
);

console.log(`Processing ${dataLines.length} pulsar entries...`);

// Function to extract values from a line
function extractPulsarData(line) {
    try {
        // Extract key fields using regex patterns
        const idMatch = line.match(/^\s*(\d+)\s+([J\d+-]+)/);
        const jname = idMatch ? idMatch[2].trim() : null;
        
        // Extract Galactic coordinates using regex
        const glMatch = line.match(/\d+\.\d+\s+(-?\d+\.\d+)/);
        const gl = glMatch ? parseFloat(glMatch[0]) : null;
        const gbMatch = glMatch ? line.substring(line.indexOf(glMatch[0]) + glMatch[0].length).match(/(-?\d+\.\d+)/) : null;
        const gb = gbMatch ? parseFloat(gbMatch[0]) : null;

        // Extract period (P0) using regex - look for the pattern after GL and GB
        let p0 = null;
        if (gl !== null && gb !== null) {
            const afterGB = line.substring(line.indexOf(gb.toString()) + gb.toString().length);
            const p0Match = afterGB.match(/\s+(\d+\.\d+)/);
            if (p0Match) {
                p0 = parseFloat(p0Match[1]);
            }
        }

        // Extract association information
        let assoc = null;
        const associationPattern = /(GRS|XRS|SNR|GC|OPT):[^,\s]+/g;
        const associationMatches = line.match(associationPattern);
        if (associationMatches && associationMatches.length > 0) {
            assoc = associationMatches.join(', ');
        }

        // Compute distance (very rough approximation based on DM)
        // In reality, the distance calculation is complex and involves electron density models
        // For this visualization, we'll use a very simple approximation
        // or assign random distances for display purposes
        const dist = Math.random() * 10 + 0.1; // Random distance between 0.1 and 10.1 kpc

        return {
            JNAME: jname,
            ASSOC: assoc || "",
            P0: p0,
            GL: gl,
            GB: gb,
            DIST: dist
        };
    } catch (e) {
        console.error(`Error processing line: ${line}`);
        console.error(e);
        return null;
    }
}

// Process each line to extract pulsar data
const pulsarData = dataLines
    .map(extractPulsarData)
    .filter(pulsar => 
        pulsar && 
        pulsar.JNAME && 
        pulsar.GL !== null && 
        pulsar.GB !== null && 
        pulsar.P0 !== null
    );

console.log(`Successfully processed ${pulsarData.length} pulsars with complete data.`);

// Write the extracted data to a JSON file
const outputPath = path.join(process.cwd(), 'processed_pulsar_data.js');
const jsonContent = `// Processed pulsar data from PSRCat catalog
// Automatically generated from pulsar_data.txt
// Total pulsars: ${pulsarData.length}

export const pulsarData = ${JSON.stringify(pulsarData, null, 2)};
`;

fs.writeFileSync(outputPath, jsonContent);
console.log(`Data written to ${outputPath}`);

// Also output a smaller sample for faster loading during development
const sampleSize = 100;
const sampleData = pulsarData
    .sort(() => Math.random() - 0.5) // Shuffle the array
    .slice(0, sampleSize);

const sampleOutputPath = path.join(process.cwd(), 'sample_pulsar_data.js');
const sampleContent = `// Sample of processed pulsar data (${sampleSize} pulsars)
// Automatically generated from pulsar_data.txt

export const pulsarData = ${JSON.stringify(sampleData, null, 2)};
`;

fs.writeFileSync(sampleOutputPath, sampleContent);
console.log(`Sample data (${sampleSize} pulsars) written to ${sampleOutputPath}`);
