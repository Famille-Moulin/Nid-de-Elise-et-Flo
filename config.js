// ─────────────────────────────────────────────────────────────
//  Configuration de la synchronisation (voir README.md, étape 3)
//
//  Tant que firebaseConfig vaut null, l'application fonctionne en
//  « mode local » : tout est enregistré sur le téléphone, sans synchro.
//
//  Pour activer la synchro entre vos deux téléphones, remplace null
//  par l'objet copié depuis la console Firebase, par exemple :
//
//  export const firebaseConfig = {
//    apiKey: "AIza...",
//    authDomain: "notre-nid-1234.firebaseapp.com",
//    databaseURL: "https://notre-nid-1234-default-rtdb.europe-west1.firebasedatabase.app",
//    projectId: "notre-nid-1234",
//    storageBucket: "notre-nid-1234.appspot.com",
//    messagingSenderId: "1234567890",
//    appId: "1:1234567890:web:abcdef"
//  };
//
//  Ces clés ne sont pas secrètes : la sécurité est assurée par les
//  règles de la base (fichier database.rules.json) qui n'autorisent
//  que vos deux adresses e-mail.
// ─────────────────────────────────────────────────────────────

export const firebaseConfig = {apiKey: "AIzaSyBNJQXfEP3EychQRV6lRknxSv0meZcjiRk",
  authDomain: "nid-de-elise-et-flo.firebaseapp.com",
  databaseURL: "https://nid-de-elise-et-flo-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "nid-de-elise-et-flo",
  storageBucket: "nid-de-elise-et-flo.firebasestorage.app",
  messagingSenderId: "166972730678",
  appId: "1:166972730678:web:44685d177daf51927ed797"
};
