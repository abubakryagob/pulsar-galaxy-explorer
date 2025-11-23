// CSV Data Processor for Pulsar Visualization
// Processes the pulsar catalog CSV and converts it to JavaScript data

const fs = require('fs');

function processCSV(inputFile, outputFile) {
    const data = fs.readFileSync(inputFile, 'utf8');
    const lines = data.split('\n');
    
    const pulsarData = [];
    let headerFound = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip comment lines and empty lines
        if (line.startsWith('#') || line === '') {
            continue;
        }
        
        // Split by semicolon (CSV delimiter)
        const fields = line.split(';');
        
        if (fields.length < 11) {
            continue; // Skip malformed lines
        }
        
        try {
            const pulsar = {
                id: parseInt(fields[0]) || 0,
                name: fields[1] || 'Unknown',
                ra: fields[2] || '',
                dec: fields[3] || '',
                gl: parseFloat(fields[4]) || 0,
                gb: parseFloat(fields[5]) || 0,
                period: parseFloat(fields[6]) || 1,
                frequency: parseFloat(fields[7]) || 0,
                dm: parseFloat(fields[8]) || 0,
                binary: fields[9] || '',
                association: fields[10] || ''
            };
            
            // Filter out pulsars with invalid coordinates or periods
            if (pulsar.gl && pulsar.gb && pulsar.period > 0 && pulsar.period < 100) {
                // Calculate distance estimate from DM (simplified)
                // DM to distance conversion: rough approximation d ≈ DM / 30
                pulsar.distance = pulsar.dm > 0 ? Math.max(0.1, pulsar.dm / 30) : Math.random() * 5 + 1;
                
                pulsarData.push(pulsar);
            }
        } catch (error) {
            console.warn(`Skipping malformed line ${i + 1}: ${line}`);
        }
    }
    
    console.log(`Processed ${pulsarData.length} pulsars from ${lines.length} lines`);
    
    // Generate JavaScript export
    const jsContent = `// Processed pulsar data from CSV
// Generated on ${new Date().toISOString()}

export const pulsarData = ${JSON.stringify(pulsarData, null, 2)};

export const pulsarStats = {
    total: ${pulsarData.length},
    fastPulsars: ${pulsarData.filter(p => p.period < 0.1).length},
    mediumPulsars: ${pulsarData.filter(p => p.period >= 0.1 && p.period < 1).length},
    slowPulsars: ${pulsarData.filter(p => p.period >= 1).length},
    minPeriod: ${Math.min(...pulsarData.map(p => p.period))},
    maxPeriod: ${Math.max(...pulsarData.map(p => p.period))},
    avgDistance: ${(pulsarData.reduce((sum, p) => sum + p.distance, 0) / pulsarData.length).toFixed(2)}
};
`;
    
    fs.writeFileSync(outputFile, jsContent);
    console.log(`Data written to ${outputFile}`);
    
    return pulsarData;
}

// Run the processor
if (require.main === module) {
    const inputFile = 'data_short.csv';
    const outputFile = 'csv_pulsar_data.js';
    
    try {
        processCSV(inputFile, outputFile);
    } catch (error) {
        console.error('Error processing CSV:', error);
    }
}

module.exports = { processCSV };
