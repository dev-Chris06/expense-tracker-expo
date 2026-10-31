// Point d'entrée : installe le gestionnaire d'erreurs avant de charger les
// écrans, pour qu'il couvre aussi les erreurs survenues au démarrage.
import "./utils/crashReporter";
import "expo-router/entry";
