const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.CORS_ORIGINS ? 
      process.env.CORS_ORIGINS.split(',') : 
      [
        'http://localhost:3000', 
        'http://127.0.0.1:3000'
      ];
    
    // Also allow any Render domain for your frontend
    const isRenderDomain = origin.includes('fuel-economy-frontend') && origin.includes('.onrender.com');
    
    if (allowedOrigins.indexOf(origin) !== -1 || isRenderDomain) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// In-memory data store
let carsData = [];

// Load CSV data on startup
function loadData() {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(path.join(__dirname, 'auto-mpg.csv'))
      .pipe(csv())
      .on('data', (data) => {
        // Clean and transform data
        const car = {
          id: results.length + 1,
          mpg: parseFloat(data.mpg) || 0,
          cylinders: parseInt(data.cylinders) || 0,
          displacement: parseFloat(data.displacement) || 0,
          horsepower: data.horsepower === '?' ? null : parseFloat(data.horsepower),
          weight: parseFloat(data.weight) || 0,
          acceleration: parseFloat(data.acceleration) || 0,
          modelYear: parseInt(data['model year']) || 0,
          origin: parseInt(data.origin) || 0,
          carName: data['car name'] || '',
          originName: getOriginName(parseInt(data.origin))
        };
        results.push(car);
      })
      .on('end', () => {
        carsData = results;
        console.log(`Loaded ${carsData.length} car records`);
        resolve();
      })
      .on('error', reject);
  });
}

// Helper function to get origin name
function getOriginName(origin) {
  switch (origin) {
    case 1: return 'USA';
    case 2: return 'Europe';
    case 3: return 'Japan';
    default: return 'Unknown';
  }
}

// Routes

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Fuel Economy API Server', 
    version: '1.0.0',
    endpoints: {
      cars: '/api/cars',
      statistics: '/api/statistics',
      health: '/api/health'
    }
  });
});

// Get all cars with optional filtering and pagination
app.get('/api/cars', (req, res) => {
  try {
    let filteredCars = [...carsData];
    
    // Apply filters
    const { 
      search, 
      minMpg, 
      maxMpg, 
      cylinders, 
      origin, 
      minYear, 
      maxYear,
      sortBy = 'mpg',
      sortOrder = 'desc',
      page = 1,
      limit = 50
    } = req.query;

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filteredCars = filteredCars.filter(car => 
        car.carName.toLowerCase().includes(searchLower)
      );
    }

    // MPG range filter
    if (minMpg && minMpg !== 'null' && !isNaN(parseFloat(minMpg))) {
      filteredCars = filteredCars.filter(car => car.mpg >= parseFloat(minMpg));
    }
    if (maxMpg && maxMpg !== 'null' && !isNaN(parseFloat(maxMpg))) {
      filteredCars = filteredCars.filter(car => car.mpg <= parseFloat(maxMpg));
    }

    // Cylinders filter
    if (cylinders && cylinders !== 'null' && !isNaN(parseInt(cylinders))) {
      filteredCars = filteredCars.filter(car => car.cylinders === parseInt(cylinders));
    }

    // Origin filter
    if (origin && origin !== 'null' && !isNaN(parseInt(origin))) {
      filteredCars = filteredCars.filter(car => car.origin === parseInt(origin));
    }

    // Year range filter
    if (minYear && minYear !== 'null' && !isNaN(parseInt(minYear))) {
      filteredCars = filteredCars.filter(car => car.modelYear >= parseInt(minYear));
    }
    if (maxYear && maxYear !== 'null' && !isNaN(parseInt(maxYear))) {
      filteredCars = filteredCars.filter(car => car.modelYear <= parseInt(maxYear));
    }

    // Sorting
    filteredCars.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedCars = filteredCars.slice(startIndex, endIndex);

    res.json({
      data: paginatedCars,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredCars.length,
        totalPages: Math.ceil(filteredCars.length / parseInt(limit))
      },
      filters: {
        search,
        minMpg,
        maxMpg,
        cylinders,
        origin,
        minYear,
        maxYear,
        sortBy,
        sortOrder
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single car by ID
app.get('/api/cars/:id', (req, res) => {
  try {
    const car = carsData.find(c => c.id === parseInt(req.params.id));
    if (!car) {
      return res.status(404).json({ error: 'Car not found' });
    }
    res.json(car);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get statistics
app.get('/api/statistics', (req, res) => {
  try {
    const stats = {
      totalCars: carsData.length,
      avgMpg: (carsData.reduce((sum, car) => sum + car.mpg, 0) / carsData.length).toFixed(2),
      mpgRange: {
        min: Math.min(...carsData.map(car => car.mpg)),
        max: Math.max(...carsData.map(car => car.mpg))
      },
      cylindersDistribution: getCylindersDistribution(),
      originDistribution: getOriginDistribution(),
      yearRange: {
        min: Math.min(...carsData.map(car => car.modelYear)),
        max: Math.max(...carsData.map(car => car.modelYear))
      },
      avgHorsepower: getAvgHorsepower(),
      avgWeight: (carsData.reduce((sum, car) => sum + car.weight, 0) / carsData.length).toFixed(0)
    };
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper functions for statistics
function getCylindersDistribution() {
  const distribution = {};
  carsData.forEach(car => {
    distribution[car.cylinders] = (distribution[car.cylinders] || 0) + 1;
  });
  return distribution;
}

function getOriginDistribution() {
  const distribution = {};
  carsData.forEach(car => {
    const origin = car.originName;
    distribution[origin] = (distribution[origin] || 0) + 1;
  });
  return distribution;
}

function getAvgHorsepower() {
  const validHorsepower = carsData.filter(car => car.horsepower !== null);
  const sum = validHorsepower.reduce((sum, car) => sum + car.horsepower, 0);
  return (sum / validHorsepower.length).toFixed(1);
}

// Get data for visualizations
app.get('/api/visualizations/mpg-by-year', (req, res) => {
  try {
    const yearData = {};
    carsData.forEach(car => {
      const year = car.modelYear + 1900; // Convert to full year
      if (!yearData[year]) {
        yearData[year] = { totalMpg: 0, count: 0 };
      }
      yearData[year].totalMpg += car.mpg;
      yearData[year].count += 1;
    });

    const result = Object.keys(yearData)
      .map(year => ({
        year: parseInt(year),
        avgMpg: (yearData[year].totalMpg / yearData[year].count).toFixed(2),
        count: yearData[year].count
      }))
      .sort((a, b) => a.year - b.year);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/visualizations/mpg-by-cylinders', (req, res) => {
  try {
    const cylinderData = {};
    carsData.forEach(car => {
      if (!cylinderData[car.cylinders]) {
        cylinderData[car.cylinders] = { totalMpg: 0, count: 0 };
      }
      cylinderData[car.cylinders].totalMpg += car.mpg;
      cylinderData[car.cylinders].count += 1;
    });

    const result = Object.keys(cylinderData)
      .map(cylinders => ({
        cylinders: parseInt(cylinders),
        avgMpg: (cylinderData[cylinders].totalMpg / cylinderData[cylinders].count).toFixed(2),
        count: cylinderData[cylinders].count
      }))
      .sort((a, b) => a.cylinders - b.cylinders);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
async function startServer() {
  try {
    await loadData();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
