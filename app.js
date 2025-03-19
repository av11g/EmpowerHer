// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAomjSB1dyXeQztq7hKKK0zIWt1XF1CKWI",
  projectId: "empowerher-285ec",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Global variables
let map;
let heatmap;
let heatmapData = [];
let timeFilterHours = 24; // Default to 24 hours

// Initialize Google Map
function initMap() {
  // Create a new map centered at your first crime location
  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 12,
    center: { lat: 28.5956, lng: 77.1673 }, // This matches your first crime record
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    mapTypeControl: true,
    streetViewControl: false,
    fullscreenControl: true,
  });

  // Add time filter controls
  addTimeControls();

  // Load crime data from Firestore
  loadCrimeData();
}

// Add time filter controls to the map
function addTimeControls() {
  const timeControlDiv = document.createElement("div");
  timeControlDiv.className = "time-control";
  timeControlDiv.innerHTML = `
        <div style="background-color: white; padding: 10px; border-radius: 5px; margin: 10px; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
            <h3 style="margin-top: 0;">Time Filter</h3>
            <select id="time-filter" style="padding: 5px; margin-right: 10px;">
                <option value="6">Last 6 hours</option>
                <option value="12">Last 12 hours</option>
                <option value="24" selected>Last 24 hours</option>
                <option value="48">Last 48 hours</option>
                <option value="168">Last week</option>
                <option value="720">Last month</option>
                <option value="0">All time</option>
            </select>
            <button id="apply-time-filter" style="padding: 5px 10px;">Apply</button>
            <div id="status-message" style="margin-top: 5px;"></div>
        </div>
    `;

  // Add the control to the map
  map.controls[google.maps.ControlPosition.TOP_LEFT].push(timeControlDiv);

  // Add event listener for the apply button
  setTimeout(() => {
    document
      .getElementById("apply-time-filter")
      .addEventListener("click", function () {
        timeFilterHours = parseInt(
          document.getElementById("time-filter").value
        );
        loadCrimeData();
      });
  }, 500);
}

// Load crime data from Firestore with time filtering
function loadCrimeData() {
  // Clear existing heatmap data
  heatmapData = [];

  // Update status message
  const statusElem = document.getElementById("status-message");
  if (statusElem) {
    statusElem.textContent = "Loading crime data...";
  }

  // Create a query based on the time filter
  let query = db.collection("crime");

  // Apply time filter if not "All time"
  if (timeFilterHours > 0) {
    const timeThreshold = new Date();
    timeThreshold.setHours(timeThreshold.getHours() - timeFilterHours);

    // If you have a timestamp field, use it for filtering
    // If not, you'll need to add timestamps to your data
    // For now, we'll just fetch all data
    // query = query.where("timestamp", ">=", timeThreshold);
  }

  // Execute the query
  query
    .get()
    .then((querySnapshot) => {
      if (querySnapshot.empty) {
        console.log(`No crime data found`);
        if (statusElem) {
          statusElem.textContent = "No crime data found";
        }
        // Create empty heatmap to clear previous data
        createHeatmap();
        return;
      }

      // Process each document
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.latitude && data.longitude) {
          // Create a weighted location
          const location = new google.maps.LatLng(
            data.latitude,
            data.longitude
          );

          // If you have a severity field, you can use it for weighting
          if (data.severity) {
            const weight = parseFloat(data.severity);
            heatmapData.push({ location: location, weight: weight });
          } else {
            heatmapData.push(location);
          }
        }
      });

      // Create or update the heatmap
      createHeatmap();

      // Update status message
      if (statusElem) {
        const statusMessage =
          timeFilterHours > 0
            ? `Showing ${heatmapData.length} crimes from the last ${timeFilterHours} hours`
            : `Showing all ${heatmapData.length} crime locations`;
        statusElem.textContent = statusMessage;
      }

      console.log(`Loaded ${heatmapData.length} crime locations`);
    })
    .catch((error) => {
      console.error("Error getting crime data: ", error);
      if (statusElem) {
        statusElem.textContent = "Error loading crime data";
      }
    });
}

// Create the heatmap layer
function createHeatmap() {
  // If heatmap already exists, remove it first
  if (heatmap) {
    heatmap.setMap(null);
  }

  // Make sure we have the Google Maps visualization library loaded
  if (typeof google.maps.visualization === "undefined") {
    console.error("Google Maps visualization library not loaded!");
    return;
  }

  // Create the heatmap with initial settings
  heatmap = new google.maps.visualization.HeatmapLayer({
    data: heatmapData,
    map: map,
    radius: document.getElementById("radius")
      ? parseInt(document.getElementById("radius").value)
      : 20,
    opacity: document.getElementById("opacity")
      ? parseFloat(document.getElementById("opacity").value) / 10
      : 0.7,
  });

  // Debug output
  console.log(`Created heatmap with ${heatmapData.length} crime locations`);

  // Check if heatmap is visible
  if (heatmap.getMap() === null) {
    console.error("Heatmap is not visible on the map!");
    // Force it to be visible
    heatmap.setMap(map);
  }
}

// Update heatmap based on control settings
function updateHeatmap() {
  if (heatmap) {
    if (document.getElementById("radius")) {
      heatmap.set("radius", parseInt(document.getElementById("radius").value));
    }
    if (document.getElementById("opacity")) {
      heatmap.set(
        "opacity",
        parseFloat(document.getElementById("opacity").value) / 10
      );
    }
  }
}

// Refresh data from Firestore
function refreshData() {
  loadCrimeData();
}

// Make sure the Google Maps Visualization library is loaded
function loadGoogleMapsVisualization() {
  // Check if the visualization library is already loaded
  if (typeof google.maps.visualization === "undefined") {
    console.log("Loading Google Maps visualization library...");

    // Load the visualization library
    const script = document.createElement("script");
    script.src =
      "https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=visualization&callback=initMap";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  } else {
    // Visualization library is already loaded, initialize the map
    initMap();
  }
}

// Call this function to start everything
function initialize() {
  // Check if Google Maps is loaded
  if (typeof google === "undefined" || typeof google.maps === "undefined") {
    console.error("Google Maps API not loaded!");
    return;
  }

  loadGoogleMapsVisualization();
}

// Call initialize when the page loads
window.onload = initialize;
