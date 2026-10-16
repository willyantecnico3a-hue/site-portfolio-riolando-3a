const firebaseConfigHorariosTv = {
    apiKey: "AIzaSyCJ-IXqb9nUkh-i4vtv4ueM9EaN1jUqKuA",
    authDomain: "horariosprofsriolandocanno.firebaseapp.com",
    projectId: "horariosprofsriolandocanno",
    storageBucket: "horariosprofsriolandocanno.firebasestorage.app",
    messagingSenderId: "1058196141816",
    appId: "1:1058196141816:web:54279ad58aed60f10f6d0d",
    measurementId: "G-MGMG7PYC2Y"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfigHorariosTv);
}
const firebaseDbHorariosTv = firebase.firestore();
