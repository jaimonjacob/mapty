'use strict';

const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const form = document.querySelector('form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
  id = (Date.now() + '').slice(-10);
  date = new Date();

  constructor(distance, duration, coord, id, date) {
    this.distance = distance;
    this.duration = duration;
    this.coord = coord;
  }

  _createDescription() {
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(distance, duration, coord, cadence) {
    super(distance, duration, coord);
    this.cadence = cadence;
    this._calcPace();
    this._createDescription();
  }

  _calcPace() {
    this.pace = this.duration / this.distance;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(distance, duration, coord, elevationGain) {
    super(distance, duration, coord);
    this.elevationGain = elevationGain;
    this._calcSpeed();
    this._createDescription();
  }

  _calcSpeed() {
    this.speed = this.distance / this.duration;
  }
}

class App {
  #mapV;
  #mapEvent;
  #workouts = [];
  #zoomLevel = 13;

  constructor() {
    this._getPosition();
    form.addEventListener(`submit`, this._newWorkout.bind(this));
    containerWorkouts.addEventListener(
      `click`,
      this._moveToLocation.bind(this)
    );
    inputType.addEventListener('change', this._toggleElevationField.bind(this));
  }

  _getPosition() {
    navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), () =>
      console.log(`Your position couldnt be detected`)
    );
  }

  _loadMap(pos) {
    const { latitude, longitude } = pos.coords;
    const mapCoordins = [latitude, longitude];
    this.#mapV = L.map('map').setView(mapCoordins, this.#zoomLevel);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#mapV);
    this.#mapV.on('click', this._showForm.bind(this));
    this._geLocalStorage();
  }

  _showForm(e) {
    this.#mapEvent = e;
    form.classList.remove('form_hidden');
    inputDistance.focus();
  }

  _toggleElevationField(e) {
    inputCadence.closest('.form__row').classList.toggle(`form__row--hidden`);
    inputElevation.closest('.form__row').classList.toggle(`form__row--hidden`);
  }

  _newWorkout(e) {
    e.preventDefault();
    const workType = inputType.value;
    const workDistance = +inputDistance.value;
    const workDuration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    const workCoord = [lat, lng];
    let workout;

    const checkIfNum = (...inputs) => inputs.every(el => Number.isFinite(el));
    const checkPositive = (...inputs) => inputs.every(el => el > 0);

    if (workType === `running`) {
      const workCadence = +inputCadence.value;
      if (
        !checkIfNum(workDistance, workDistance, workCadence) ||
        !checkPositive(workDistance, workDistance, workCadence)
      ) {
        return alert(`invalid input`);
      }

      workout = new Running(
        workDistance,
        workDuration,
        [lat, lng],
        workCadence
      );
    }

    if (workType === `cycling`) {
      const workElevation = +inputElevation.value;
      if (
        !checkIfNum(workDistance, workDistance, workElevation) ||
        !checkPositive(workDistance, workDistance)
      ) {
        return alert(`invalid input`);
      }
      workout = new Cycling(
        workDistance,
        workDuration,
        workCoord,
        workElevation
      );
    }

    this.#workouts.push(workout);
    this._hideForm();
    this._renderMarker(workout);
    this._renderWorkoutEntry(workout);
    this._setLocalStorage(this.#workouts);
  }

  _hideForm() {
    form.classList.add(`form_hidden`);
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        ``;
  }

  _renderWorkoutEntry(workout) {
    let html = `
  <li class="workout workout--${workout.type}" data-id=${workout.id}>
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === `running` ? `🏃‍♂️` : `🚴‍♀️`
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>            
  `;

    html += `
     </div>
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${
              workout.type === `running`
                ? workout.pace.toFixed(2)
                : workout.speed.toFixed(2)
            }</span>
            <span class="workout__unit">${
              workout.type === `running` ? `min/km` : `km/h`
            }</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${
              workout.type === `running`
                ? workout.cadence
                : workout.elevationGain
            }</span>
            <span class="workout__unit">${
              workout.type === `running` ? `spm` : `m`
            }</span>
          </div>
  `;

    form.insertAdjacentHTML('afterend', html);
  }

  _renderMarker(workout) {
    L.marker(workout.coord)
      .addTo(this.#mapV)
      .bindPopup(
        L.popup({
          content: `${workout.description}`,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .openPopup();
  }

  _moveToLocation(e) {
    if (e.target.closest('.workout')) {
      const cilckObjectParent = e.target.closest('.workout');
      const targetLocation = this.#workouts.find(
        el => el.id === cilckObjectParent.dataset.id
      );
      this.#mapV.setView(targetLocation.coord, this.#zoomLevel);
    }
  }

  _setLocalStorage(workouts) {
    localStorage.setItem('storedWorkouts', JSON.stringify(workouts));
  }

  _geLocalStorage() {
    const gotWorkouts = JSON.parse(localStorage.getItem('storedWorkouts'));
    console.log(gotWorkouts);
    if (gotWorkouts) {
      this.#workouts = gotWorkouts;
      this.#workouts.forEach(el => {
        this._renderWorkoutEntry(el);
        this._renderMarker(el);
      });
    }
  }

  reset() {
    localStorage.removeItem(`storedWorkouts`);
    location.reload();
  }
}

const app = new App();
