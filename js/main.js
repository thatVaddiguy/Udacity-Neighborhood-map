//array of places
var places = [
	{
		name: 'Electra Park',
		address: 'Electra Street',
		lat: 24.496626,
		lng: 54.37644,
		info: 'Nice Park in the center of the city',
		tags: ['Parks']
	},
	{
		name: 'Colors Hypermarket',
		address: 'Electra Street',
		lat: 24.495516,
		lng: 54.377437,
		info: 'Local hypermarket for groceries',
		tags: ['Shopping']
	},
	{
		name: 'SamiRamis',
		address: 'Behind Colors Hypermarket',
		lat: 24.495174,
		lng: 54.377968,
		info: 'Best Shawarma in Town',
		tags: ['Food']
	},
	{
		name: 'KFC',
		address: 'Electra Street',
		lat: 24.496892,
		lng: 54.378161,
		info: 'American fried chicken in Abu Dhabi',
		tags: ['Food']
	},
	{
		name: 'Abu Dhabi Mall',
		address: 'Salam Street',
		lat: 24.495924,
		lng:  54.383226,
		info: 'One of the oldest malls in Abu Dhabi',
		tags: ['Malls','Shopping']
	},
	{
		name: 'Al Manazel Hotel',
		address: 'Electra Street',
		lat: 24.496224,
		lng: 54.378414,
		info: 'A good place to stay',
		tags: ['Food','Hotel']
	},
	{
		name: 'Hotel Grand Mercure Residence',
		address: 'Electra Street',
		lat:24.494937,
		lng:54.37612,
		info: 'Another good place to stay',
		tags:['Food','Hotel']
	}

];

//The google maps variable
var initMap = function(){
var googleMap =  {
	map: {},
	infoWindow: new google.maps.InfoWindow(),
	options: {
		center: { lat: 24.495515, lng: 54.3763476},
		zoom: 16
	},
	infoWindowContent: '<div class="info-window"><div class="window-title">%title%</div><div class="window-description">%description%</div><div class="url">Check ins - unavailable</div></div>',
	init: function(model) {
		googleMap.map = new google.maps.Map(document.getElementById('map'), googleMap.options);
		model.showMarkers();
	}
};


//The place variable
var Place = function(data, parent) {
	// place info converted into knockout
	this.name = ko.observable(data.name);
	this.info = ko.observable(data.info);
	this.address = ko.observable(data.address);
	this.tags = ko.observableArray(data.tags);
	this.lat = ko.observable(data.lat);
	this.lng = ko.observable(data.lng);
	this.initialized = ko.observable(false);

	// initializing marker
	var marker = new google.maps.Marker({
		position: new google.maps.LatLng(data.lat, data.lng),
		animation: google.maps.Animation.DROP,
		map: googleMap.map
	});

	// click handler for google maps marker
	google.maps.event.addListener(marker, 'click', (function(place, parent) {
		return function() {
			parent.showPlace(place);
		};
	}) (this, parent));
	this.marker = marker;
	marker.addListener('click',function(){
		marker.setAnimation(google.maps.Animation.BOUNCE);
		setTimeout(function(){marker.setAnimation(null);},700);
	});

};


//initializing the filter
var Filter = function(data) {
	this.name = ko.observable(data.name);
	this.on = ko.observable(true);
};

//initializing the viewmodel
var ViewModel = function() {
	var self = this;
	self.searchFilter = ko.observable('');
	self.currentPlace = ko.observable();
	self.initialized = false;
	self.hasMarkers = false;
	self.connectionError = ko.observable(false);

	self.init = function() {
		var tempTags = [];
		var tempFilters = [];

		// creating array of places
		self.placesList = ko.observableArray([]);

		// loop through places array and convert to ko object
		places.forEach(function(place) {
			self.placesList.push(new Place(place, self));

			place.tags.forEach(function(tag){
				if (tempTags.indexOf(tag) < 0) {
					tempTags.push(tag);
				}
			});
		});

		//making filter objects
		tempTags.forEach(function(tag){
			tempFilters.push(new Filter({name: tag}));
		});

		// setting filters
		self.filters = ko.observableArray(tempFilters);

		self.currentFilters = ko.computed(function() {
			var tempNewFilters = [];

			ko.utils.arrayForEach(self.filters(), function(filter){
				if (filter.on()) tempNewFilters.push(filter.name());
			});

			return tempNewFilters;
		});

		// array for holding the filtered places
		self.filteredPlaces = ko.computed(function() {
			var tempPlaces = ko.observableArray([]);
			var newPlaces = ko.observableArray([]);

			// applying filters
			ko.utils.arrayForEach(self.placesList(), function(place){
				var placeTags = place.tags();

				// making sure there are no similar tags
				var samePlaces = placeTags.filter(function(tag){
					return self.currentFilters().indexOf(tag) != -1;
				});

				if (samePlaces.length > 0) {
					tempPlaces.push(place);
				}
			});

			var tempSearchFilter = self.searchFilter().toLowerCase();

			if (!tempSearchFilter){
				newPlaces = tempPlaces();
			}

			else{
				newPlaces = ko.utils.arrayFilter(tempPlaces(), function(place) {
					return place.name().toLowerCase().indexOf(tempSearchFilter) !== -1;
				});
			}

			self.newMarkers(newPlaces);
			return newPlaces;

		});

		// if no markers are there , show the markers
		if (!self.hasMarkers){
			self.showMarkers();
		}
		self.initialized = true;
	};

	//helper functions

	//making the markers visible
	self.newMarkers = function(filteredPlaces) {
		ko.utils.arrayForEach(self.placesList(), function(place){
			if (filteredPlaces.indexOf(place) === -1) {
				place.marker.setVisible(false);
			}
			else{
				place.marker.setVisible(true);
			}
		});
	};

	// toggles the filter based on the click
	self.toggleFilter = function(filter) {
		filter.on(!filter.on());
	};

	// shows the clicked place
	self.showPlace = function(place) {

		place.marker.setAnimation(google.maps.Animation.BOUNCE);
		setTimeout(function(){place.marker.setAnimation(null);},700);
		// setting up the infoWindow
		googleMap.infoWindow.setContent(googleMap.infoWindowContent.replace('%title%', place.name()).replace('%description%', place.address()));
		googleMap.infoWindow.open(googleMap.map, place.marker);

		self.connectionError(false);

		if (!place.initialized()) {

			// call to get the information from foursquare
			$.ajax({
				url: 'https://api.foursquare.com/v2/venues/search?ll='+place.lat()+','+place.lng()+'&intent=match&name='+place.name()+'&client_id=1VT4D2HXGAB5LPEVXWL4TGQOPCXQ54ZQAYAZXNTT0533NPEF&client_secret=4MBJWI1M3NQARBTEMW5OBG1JRKWC0TUIVPDYYRNOEJ4DQFWS&v=20170101'

			})
			.done(function(data){
				var venue = data.response.venues[0];
				//set the info onto a place with the help of id
				place.id = ko.observable(venue.id);

				if (venue.stats.hasOwnProperty('checkinsCount')) {
					place.checkinsCount = ko.observable(venue.stats.checkinsCount);
					googleMap.infoWindow.setContent(googleMap.infoWindowContent.replace('unavailable',place.checkinsCount()).replace('%title%',place.name()).replace('%description%',place.address()));
				}
			})
			.fail(function(err) {
				self.connectionError(true);
				alert("There was an error with the foursquare API, try refreshing the page");
			});
		}
		else {
			self.currentPlace(place);
		}
	};

	// shows all the markers
	self.showMarkers = function() {
		ko.utils.arrayForEach(self.placesList(), function(place){
			place.marker.setMap(googleMap.map);
		});

		self.hasMarkers = true;
	};
};


function errorHandling() {
	alert("Google Maps failed to load, try refreshing or check your internet connection");
}


//Setting up the page
//view model
var model = new ViewModel();

//initializing the ViewModel
$( document ).ready(function() {
	model.init();
	ko.applyBindings(model);

	$(window).on('resize', function() {
		google.maps.event.trigger(googleMap.map, 'resize');
		googleMap.map.setCenter(googleMap.options.center);
	});
});
google.maps.event.addDomListener(window, 'load', googleMap.init(model));
};
