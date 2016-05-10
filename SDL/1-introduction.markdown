---
layout: article
title: Programmer des jeux sous Linux avec SDL <br/>Partie I
description: Introduction à SDL
section: Linux Programming
tags:
- linux
- programming
- SDL
seo:
  type: TechArticle
locale: fr_FR
published: Planète Linux numéro 3
---
## Introduction à SDL

Simple Directmedia Layer (SDL) est une librairie pour le développement d'applications multimédia multi-plateformes. Placée sous licence LGPL, elle a été utilisée pour le développement de nombreuses applications, aussi bien libres que commerciales. Citons les jeux Civilization : Call To Power, Myth II, Hopkins FBI, l'émulateur Macintosh Executor, le player MpegTV, ainsi que divers autres jeux/démos/applications multimédia... Il s'agit, en fait, de l'un des principaux outils de développement utilisés par Loki. Sam Lantinga, l'auteur de SDL est d'ailleurs employé de Loki, ce qui n'est pas étonnant... ;-)

Dans cette série d'articles, nous aborderons dans le détail tous les aspects de SDL et verrons comment il est possible d'utiliser cette librairie pour développer des jeux pour notre OS favori. L'un des principaux attraits de SDL est son aspect multi-plateformes : outre Linux, on trouve également des portages pour Win32 (via GDI ou DirectX), BeOS, plus des portages officieux sous Solaris, IRIX, FreeBSD et MacOS. Les portages pour Unix supportent, bien entendu, X11, mais aussi SVGAlib, GGI et, bientôt, MGL pour la version Linux. Dans tous les cas, on passe par une seule et même API unifiée, gage de portabilité. Celle-ci est volontairement simplifiée, d'où le S de SDL...
 
SDL peut être fractionnée en quatre sous-systèmes principaux :

### Vidéo

Il s'agit sans doute du composant le plus important de SDL qui fournit une abstraction du framebuffer, sous forme de "surfaces". Le programme choisit un mode vidéo avec des caractéristiques bien précises et SDL se charge de le lui fournir si nécessaire, en effectuant toutes les conversions (il est, par exemple, possible d'obtenir une surface 24 bits dans une fenêtre X11 affichée en 8 bits). SDL supporte, de manière transparente, les modes plein-écran (en utilisant les extensions DGA et VidMode sous X11). En fait, SDL ne possède pas de notion de système de fenêtrage, bien qu'il soit possible de dialoguer avec le système sous-jacent. Concrètement, une "surface" SDL peut être vue comme un pointeur sur la mémoire vidéo. Il est tout à fait possible d'écrire directement dedans (ce qui est très pratique pour certains jeux !), mais certaines opérations peuvent, néanmoins, faire l'objet d'accélération matérielle (remplissage de rectangles, copie de blocs).

Outre la surface principale (associée au périphérique de sortie), tout programme utilisant SDL peut définir un certain nombre de surfaces hors écran (offscreen), par exemple pour y stocker des sprites ou faire du double-buffering. Là encore, SDL permet la définition de surfaces d'un format arbitraire et la librairie se charge de la conversion au vol, lors de la copie de pixels entre surfaces. Pour couronner le tout, certaines surfaces peuvent être transparentes (on définit une couleur qui sera transparente), et/ou faire de " l'alpha blending " (avoir différents degrés de transparence). Il est également possible d'interagir avec le gestionnaire de fenêtres, si le système cible le permet. C'est le cas lorsque l'on utilise X11 en mode fenêtré (non DGA). SDL fournit des fonctions portables pour changer le titre de la fenêtre, mais aussi pour récupérer directement les informations nécessaires au dialogue direct avec le système de fenêtrage. Sous X11, on obtiendra ainsi les identificateurs de Display et de fenêtre (Window).

### Gestion des événements

La gestion des périphériques d'entrée dans SDL se fait par l'intermédiaire d'une file d'événements, similaire aux files de X11 ou Win32. Les événements pouvant survenir sont les suivants : changement de visibilité de l'application, touche du clavier appuyée/relâchée, boutons et mouvements de la souris, fermeture de la fenêtre de l'application... La gestion des joysticks n'est pas encore complète, mais est en cours de développement.

Il est possible d'activer ou de désactiver certains de ces événements à volonté. Il est également possible de mettre en place un filtre (une fonction) fourni par l'utilisateur, appelé par SDL avant de placer l'événement dans la file.

SDL se charge de collecter les événements (éventuellement dans une thread différente), mais il est du devoir du programme d'interroger et "vider" la file, en fonction de ses besoins !

### Son

La partie audio de SDL est multithread : une thread dédiée est démarrée à l'initialisation de SDL. Tout comme pour la partie vidéo, SDL permet de définir arbitrairement un format de son (audio spec) qui sera converti à la volée dans le format natif par la librairie. Une fonction est présente permettant de mélanger des échantillons, éventuellement de formats différents. La lecture proprement dite se fait par l'intermédiaire d'une fonction "callback" fournie par l'utilisateur et appelée par SDL, lorsque la carte son est prête à recevoir des données. Ce mécanisme est très flexible, car la fonction n'est limitée que par l'imagination du programmeur. SDL ne fournit pas de mécanisme d'accès à la table de mixage de la carte ; on supposera toujours que l'utilisateur emploie un logiciel spécifique à cet effet (par exemple, xmixer). Enfin, il est également capable de contrôler les CD audio (opérations classiques : lecture, arrêt, pause...).

### Divers : Threads, CDROM, Timers

En dehors des sous-systèmes majeurs vus ci-dessus, SDL fournit également des services accessoires qui facilitent grandement le travail des programmeurs. Ces fonctions sont, bien entendu, portables à tous les environnements supportés par SDL.

**Threads** : fonctions de bases pour créer, terminer et synchroniser des threads, en utilisant le système de threads natif (LinuxThreads pour... Linux). Les mutex sont fournis en tant que mécanisme de synchronisation (verrous d'exclusion mutuelle pour garantir que certaines portions de programme ne sont exécutées que par une thread à la fois).

**CDROM**: Outre les fonctions liées aux CD audios (lecture de pistes), SDL est capable de détecter les lecteurs de CDROM installés sur un système et de fournir le point de montage de ceux-ci. Cela est particulièrement utile pour les jeux qui doivent accéder à des fichiers de données sur CDROM.

Enfin, SDL fournit des fonctions précises pour obtenir l'heure du système à la milliseconde près, attendre un certain nombre de millisecondes ou même, appeler une fonction à intervalles réguliers (précision de 10 ms).

Voilà pour ce qui concerne les caractéristiques générales de SDL. Il est à noter que SDL propose deux modes de fonctionnement : statique ou dynamique. Dans le mode statique, l'intégralité de la librairie est liée au programme (librairie statique, fichier `libsdl.a`). Le mode dynamique est plus intéressant car il ne s'agit pas d'une simple librairie dynamique ; le programme est toujours lié avec une petite librairie statique libsdl.a mais, au démarrage de SDL, celui-ci chargera un module (librairie dynamique `libsdl*.so`) contenant le code des routines d'affichages. La plupart du temps, il s'agira du module X11 sous Unix, mais il existe aussi des modules GGI, *SVGAlib* et d'autres sont en préparation... L'avantage évident est qu'il n'y a pas à recompiler le programme pour supporter un nouveau mode d'affichage : il suffit de spécifier un module SDL différent au démarrage !

Dans les prochains articles de cette série, nous détaillerons un à un les sous-systèmes de SDL et comment ils peuvent être utilisés efficacement dans vos programmes. En guise d'apéritif, vous trouverez en figure 1 un programme minimal qui se contente d'initialiser la librairie. Il ne s'agit pas tout à fait d'un "hello world" dans la mesure où SDL ne fournit pas de primitive d'affichage de texte : il faut passer par des surcouches à SDL que nous verrons par la suite... SDL est livrée avec de nombreuses démos et exemples et, en attendant le prochain article, nous vous invitons à visiter le site Web de SDL pour faire le tour de la librairie et mieux appréhender ses possibilités...

*Stéphane Peter*

----

### Encadré 1 : Programme le plus simple...

{% highlight c %}
#include <stdlib.h>
#include "SDL.h"

main(int argc, char *argv[])
{
	if ( SDL_Init(SDL_INIT_AUDIO|SDL_INIT_VIDEO) < 0 ) {
		fprintf(stderr, "Impossible d'initialiser SDL: %s\n", SDL_GetError());
		exit(1);
	}
	atexit(SDL_Quit);

	/* Corps du programme */

	exit(0);
}
{% endhighlight %}

### Encadré 2 : Glossaire

* **DGA**: Direct Graphics Architecture, une extension de X11 spécifique aux serveurs XFree86, qui permet l'utilisation en mode plein écran. Le programme obtient un pointeur sur la mémoire vidéo de la carte et X11 est désactivé, pour ne pas interférer.
* **VidMode**: Une autre extension spécifique à XFree86 qui permet de changer de mode vidéo en temps réel. Le mode vidéo doit néanmoins être défini dans le fichier XF86Config, mais il n'est pas possible de changer de profondeur (on ne peut pas passer de 8 bits par pixels à 16, par exemple).
* **Thread**: Un processus Unix peut se décomposer en plusieurs threads indépendantes qui sont des unités d'exécution se déroulant en parallèle. Il s'agit, en quelque sorte, de programmation parallèle au sein d'un même programme. Cela est très utile pour décomposer un programme en tâches distinctes (interface utilisateur, moteur interne, etc.. sans parler du gain de performances sur les machines multi-processeurs, car chaque thread peut être allouée à un processeur différent.

### Références:

SDL Home Page : [www.libsdl.org](http://www.libsdl.org)
