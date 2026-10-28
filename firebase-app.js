(function () {
    const config = {
        apiKey: "AIzaSyCJ-IXqb9nUkh-i4vtv4ueM9EaN1jUqKuA",
        authDomain: "horariosprofsriolandocanno.firebaseapp.com",
        projectId: "horariosprofsriolandocanno",
        storageBucket: "horariosprofsriolandocanno.firebasestorage.app",
        messagingSenderId: "1058196141816",
        appId: "1:1058196141816:web:54279ad58aed60f10f6d0d",
        measurementId: "G-MGMG7PYC2Y",
        appCheckSiteKey: "6Ld-KQMuAAAAAD5zB1its5JeP0-q_1aPbH0G_TG6"
    };

    if (!firebase.apps.length) firebase.initializeApp(config);
    window.firebaseConfigRiolando = config;
    window.firebaseAppCheckSiteKeyRiolando = config.appCheckSiteKey;
    window.firebaseAuthRiolando = firebase.auth();
    window.firebaseDbRiolando = firebase.firestore();
}());
