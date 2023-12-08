const firebaseConfig = {
    apiKey: "AIzaSyBEW9ROrIyJXqF9HLkm4gTGnEUP3DQGcxs",
    authDomain: "play-matimato.firebaseapp.com",
    projectId: "play-matimato",
    storageBucket: "play-matimato.appspot.com",
    messagingSenderId: "306047491019",
    appId: "1:306047491019:web:180724d660925aae39b44e",
    measurementId: "G-7J75LH36BC"
 };

const firebaseApp = firebase.initializeApp(firebaseConfig);
const database = firebaseApp.database();
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
