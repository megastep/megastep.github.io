---
layout: article
title: Programmer des jeux sous Linux avec SDL <br/>Partie III
description: Gestion des évènements
section: Linux Programming
redirect_from: /SDL/progsdl3.html
tags:
- linux
- programming
- SDL
seo:
  type: TechArticle
locale: fr_FR
published: Planète Linux numéro 5
---
## Gestion des évènements

Le numéro précédent traitait de la programmation graphique par l'intermédiaire de la librairie SDL. Cet article aborde la gestion des événements, ce qui va vous permettre d'ajouter un peu d'interactivité avec l'utilisateur, via le clavier et la souris.
 
Il est à noter que, dans la version actuelle de SDL, les joysticks ne sont pas encore supportés. Cependant, cela ne saurait tarder (n'oublions pas que Loki se sert de SDL pour la réalisation de ses jeux), le support de ce type de périphérique étant nécessaire à nombre de jeux vidéo.

SDL aborde la gestion des événements par l'intermédiaire d'une file ('event queue'), similaire aux files d'événements présentes dans la plupart des systèmes d'interface graphique, que ce soit X11, Win32, ou MacOS. La librairie prend en charge l'insertion des éléments dans la file, au fur et à mesure qu'ils se produisent. Il est ensuite à la charge de l'application de retirer les événements de la file d'attente et de les traiter en conséquence. SDL permet une gestion de la file des événements dans une thread séparée, afin qu'il n'y ait pas d'interférence avec le programme principal. La thread des événements sera ainsi chargée de surveiller en permanence l'arrivée de nouveaux événements X11, en parallèle avec le programme, assurant que ceux-ci seront traités aussi vite que possible.

### Initialisation de SDL

Il n'est pas nécessaire de passer d'argument supplémentaire à la fonction `SDL_Init()`, la gestion des événements étant toujours démarrée par défaut avec le sous-système graphique (**SDL_INIT_VIDEO**). Cependant, il existe le flag **SDL_INIT_EVENTTHREAD** qui peut être combiné et permet l'activation de la gestion threadée des événements. Cela suppose certaines implications que nous verrons plus loin dans cet article. Certaines fonctions de base permettent d'accéder à la file d'événements. Chaque événement SDL est représenté par le type `SDL_Event`, défini comme une union C des différents sous-types possibles :

{% highlight c %}
typedef union {
        Uint8 type;
        SDL_ActiveEvent active;
        SDL_KeyboardEvent key;
        SDL_MouseMotionEvent motion;
        SDL_MouseButtonEvent button;
        SDL_QuitEvent quit;
        SDL_SysWMEvent syswm;
} SDL_Event;
{% endhighlight %}

Le champ `type` permet d'identifier le type de l'événement, parmi les valeurs suivantes : **SDL_ACTIVEEVENT**, **SDL_KEYDOWN**, **SDL_KEYUP**, **SDL_MOUSEMOTION**, **SDL_MOUSEBUTTONUP**, **SDL_MOUSEBUTTONDOWN**, **SDL_SYSWMEVENT**, **SDL_QUIT**.

### Manipulation de la queue

Elle se fait par l'intermédiaire des cinq fonctions suivantes :

{% highlight c %}
void SDL_PumpEvents(void);
{% endhighlight %}

Cette fonction permet de laisser SDL remplir la file d'événements avec ceux en attente sur le système (mise à jour de la file). Cette fonction est généralement appelée dans la boucle principale de gestion des événements de l'application (voir l'exemple ci-dessous).

{% highlight c %}
int SDL_PollEvent(SDL_Event *event);
{% endhighlight %}

Essaie de sortir un événement de la file d'attente (opération non bloquante). La fonction retourne 0, si aucun événement n'est disponible et 1, dans le cas contraire. L'événement éventuellement récupéré est stocké dans la structure dont l'adresse est fournie en paramètre et qui peut être `NULL`, si l'on désire simplement ne pas en tenir compte.

{% highlight c %}
int SDL_WaitEvent(SDL_Event *event);
{% endhighlight %}

Il s'agit de la variante bloquante de `SDL_PollEvent()`, autrement dit la fonction ne finit que lorsqu'un événement est disponible (auquel cas la valeur retournée est 1), ou en cas d'erreur (retourne 0).

{% highlight c %}
int SDL_PeepEvents(SDL_Event *events, int numevents, SDL_eventaction action, Uint32 mask);
{% endhighlight %}

Cette fonction permet une manipulation plus poussée de la file d'événements. Plusieurs opérations sont disponibles, comme l'indiquent les valeurs possibles du paramètre 'action':

* **SDL_ADDEVENT** : `numevents` événements sont ajoutés à la file.
* **SDL_PEEKEVENT** : Jusqu'à `numevents` événements en attente sont lus dans la file, mais ceux-ci n'en sont pas extraits (utiliser **GETEVENT** à cet effet).
* **SDL_GETEVENT** : Comme pour **PEEKEVENT**, mais les événements lus sont retirés de la file.

Le paramètre `mask` optionnel indique un masque des événements à extraire qui est une combinaison binaire.

{% highlight c %}
Uint8 SDL_EventState(Uint8 type, int state);
{% endhighlight %}

Cette fonction permet de changer la manière dont sont traités certains types d'événements. Le paramètre `type` indique les types d'événements auxquels la fonction s'applique et `state` peut avoir l'une des valeurs suivantes :

* **SDL_IGNORE** : les événements seront ignorés et ne seront donc plus mis dans la file.
* **SDL_ENABLE** : active certains types d'événements qui étaient auparavant ignorés.
* **SDL_QUERY** : la fonction retourne l'état actuel de traitement des événements spécifiés, c'est-à-dire soit **SDL_IGNORE**, soit **SDL_ENABLE**.

### Types d'événements

Le champ `type` de `SDL_Event` indique le type d'événement reçu. Suivant la valeur de celui-ci, il faudra consulter l'un des champs de la structure, et lui seul (les autres n'étant pas valides pour le 'type' spécifié) !

**Fin d'application (SDL_QUIT) :** cet événement est reçu lorsque l'utilisateur a requis la fin de l'application de manière indirecte, c'est-à-dire s'il a tenté de fermer la fenêtre X11 de l'application ou s'il a utilisé la combinaison de touche Control-C. Cela permet de terminer proprement le programme dans ces conditions. Aucune autre information n'est fournie par SDL pour ce type d'événement.

**Evénements d'activation (SDL_ACTIVEEVENT) :** ces événements sont reçus pour indiquer des changements d'état de l'application, notamment si celle-ci a perdu le focus de la souris et/ou du clavier. Les détails de l'événement sont fournis dans le champ `active` de `SDL_Event` qui est du type suivant :

{% highlight c %}
typedef struct {
        Uint8 type; /* Le type d'événement, SDL_ACTIVEEVENT */
        Uint8 gain; /* Valeur booléenne indiquant s'il s'agit 
                       d'un gain ou d'une perte */
        Uint8 state;/* Combinaison de SDL_APPMOUSEFOCUS, 
                       SDL_APPINPUTFOCUS, SDL_APPACTIVE */
} SDL_ActiveEvent;
{% endhighlight %}

On peut donc savoir quand l'application perd le focus pour la souris, le clavier ou si, tout simplement, l'application est inactive (non disponible, comme lorsqu'elle est icônifiée sous X11).

La fonction `SDL_GetAppState(void)` permet de connaître l'état actuel de l'application, sous la forme d'une combinaison similaire au champ `state` ci-dessus.

**Clavier (SDL_KEYDOWN, SDL_KEYUP) :** la pression et le relâchement d'une touche sont signalés au programme par deux types d'événements distincts. Les détails sont dans le champ `key` de `SDL_Event` dont le type est le suivant :

{% highlight c %}
typedef struct {
Uint8 type;   /* Type d'événement: SDL_KEYDOWN 
                         ou SDL_KEYUP */
        Uint8 state;  /* SDL_PRESSED ou SDL_RELEASED */
        SDL_keysym keysym;
} SDL_KeyboardEvent;
{% endhighlight %}

`state` indique donc si la touche décrite dans `keysym` a été enfoncée ou relâchée. Le type `SDL_keysym` est défini comme suit :

{% highlight c %}
typedef struct {
Uint8 scancode; /* Code dépendant du système, recueilli par SDL */
        SDLKey sym;     /* Symbole correspondant, abstrait par SDL */
        SDLMod mod;     /* Etat des modificateurs (Shift, Alt, Control, etc...) 
*/
        Uint16 unicode; /* Caractère Unicode correspondant, si activé */
} SDL_keysym;
{% endhighlight %}

SDL définit un ensemble de symboles pour les touches les plus répandues et ces symboles sont portables entre les systèmes, au contraire du 'scancode' qui est dépendant de ceux-ci. Vous pourrez en consulter la liste complète dans le fichier `SDL_keysym.h`.

La fonction `SDL_EnableUNICODE(int enable)` permet d'activer/désactiver la gestion du mode Unicode (utile surtout pour les claviers non QWERTY). Concrètement, cela permet d'intercepter les touches non gérées directement par SDL. Sous X11, cette fonction laisse notamment le serveur X faire la traduction entre le code de la touche et son caractère ASCII.

Parmi les fonctions utilitaires liées au clavier, on trouve `SDL_GetKeyName(SDLKey key)` qui renvoie une chaîne de caractères décrivant "en clair" la touche passée en argument. La fonction `SDL_GetKeyState(int *numkeys)` permet de connaître l'état global du clavier par l'intermédiaire d'un tableau d'entiers 8 bits indexés par les valeurs du type `SDLKey`. Ainsi, si l'on voulait tester si la touche 'F' est enfoncée à l'aide de cette fonction, on ferait :

{% highlight c %}
	int numkeys; /* Taille du tableau renvoyé, en nombre de touches */
	Uint8 *ks = SDL_GetKeyState(&numkeys);
	if( ks[SDLK_f] ) {
		/* La touche F est enfoncée */
	}
{% endhighlight %}

Les modifieurs (qui sont en fait les touches Alt, Control, Shift et Meta) ont un état maintenu par SDL et rappelé avec chaque événement clavier. Néanmoins, des événements séparés sont envoyés lors de la pression ou la relâche de chacune de ces touches. La fonction `SDL_GetModState()` permet de savoir à tout moment l'état actuel des modifieurs. Il s'agit d'une combinaison des valeurs suivantes (une liste complète est dans `SDL_keysym.h`) : **KMOD_CTRL**, **KMOD_SHIFT**, **KMOD_ALT**, ...

**Souris (SDL_MOUSEBUTTONDOWN, SDL_MOUSEBUTTONUP, SDL_MOUSEMOTION) :** SDL gère l'état des 3 boutons de la souris, ainsi que le placement du curseur. La plupart du temps, le système sous-jacent est chargé de la gestion du curseur de la souris. Néanmoins, si le besoin s'en fait sentir, SDL est également capable de gérer par lui-même l'affichage du curseur (particulièrement dans les versions récentes de la librairie). Nous verrons ceci plus en détails, dans un prochain numéro de notre initiation.

Les événements **SDL_MOUSEMOTION**, déclenchés lors du déplacement du curseur, fournissent les détails suivants :

{% highlight c %}
typedef struct {
        Uint8 type;  /* Toujours SDL_MOUSEMOTION */
        Uint8 state;
        Uint16 x, y; /* Nouvelles coordonnées du curseur */
        Sint16 xrel; 
        Sint16 yrel; /* Différences par rapport aux dernières 
coordonnées */
} SDL_MouseMotionEvent;
{% endhighlight %}

De même, pour l'interaction avec les boutons, il faudra utiliser la structure suivante :

{% highlight c %}
typedef struct {
        Uint8 type; /* SDL_MOUSEBUTTONDOWN ou SDL_MOUSEBUTTONUP */
        Uint8 state;/* SDL_PRESSED ou SDL_RELEASED */
        Uint8 button; /* Numéro du bouton concerné */
        Uint16 x, y; /* Coordonnées du curseur au moment de 
l'événement */
} SDL_MouseButtonEvent;
{% endhighlight %}

SDL gère les 3 boutons de la souris (numérotés de 1 à 3, 2 étant utilisé pour le bouton du milieu). La fonction `SDL_GetMouseState(Uint16 *x, Uint16 *y)` permet de récupérer de manière aisée la position actuelle du curseur. La fonction renvoie également une combinaison binaire indiquant l'état des boutons de la souris, état qui peut être testé à l'aide de la macro `SDL_BUTTON()`. A l'inverse, `SDL_WarpMouse()` permet de déplacer explicitement le curseur de la souris à un endroit précis, par rapport à la surface SDL principale (généralement la fenêtre de l'application). Un événement **SDL_MOUSEMOTION** est également généré dans ce cas.

**Evénements divers (SDL_SYSWMEVENT) :** si ceux-ci ont été activés, ils permettent de récupérer les événements dépendants du système et non interprétés directement par la librairie. Libre à vous d'en faire ce que bon vous semble ! Une utilisation possible est le couper/coller (clipboard) avec X11, ceci demandant l'interception d'événements spécifiques.

### Mise en place de filtres

Afin de garder un contrôle encore plus strict sur la nature des événements à traiter par SDL (et outre les attributs simples 'ignoré' et 'activé'), la fonction

{% highlight c %}
SDL_SetEventFilter(SDL_EventFilter filter);
{% endhighlight %}

permet la mise en place d'un filtre plus fin. Il s'agit, en fait, d'une fonction fournie par l'utilisateur et qui permettra ainsi un examen approfondi de chaque événement avant de décider s'il doit être ajouté dans la liste des événements.

Le type `SDL_EventFilter` est en fait un pointeur de fonction. Sa définition est la suivante :

{% highlight c %}
typedef int (*SDL_EventFilter)(const SDL_Event *event);
{% endhighlight %}

La fonction filtre devra renvoyer 1, si l'événement doit être enfilé et 0, dans le cas contraire. Le filtre est donc appelé après que SDL ait intercepté l'événement, mais avant que celui-ci ne soit mis dans la file.

### Enfin, l'exemple !

Si la gestion des événements à SDL peut paraître un peu indigeste au premier abord, en fait, elle est très facile à utiliser, comme le montre le programme de l'encadré 1. Ce programme ouvre une fenêtre SDL et met en place un filtre d'événements qui affiche les coordonnées du curseur de la souris. Rien de très visuel pour l'instant, mais c'est obligatoire si l'on veut garder les exemples suffisamment simples dans un premier temps. La fin du programme est déclenchée, soit par l'envoi de deux événements `SDL_QUIT` (fermeture de la fenêtre) ou de l'appui simultané de la touche Esc et de l'un des boutons de la souris (bien que les événements du clavier ne soient pas explicitement traités !).

Une nouvelle version de SDL, 0.11.x, a récemment été diffusée. Elle apporte un tout nouveau système de configuration/compilation (basé sur les outils GNU *autoconf* et *libtool*). Le processus de compilation est ainsi grandement facilité et cette nouvelle version apporte également son lot de corrections de bugs.

Dans le prochain article, nous aborderons un domaine complètement différent et nous apprendrons à faire du bruit avec SDL, grâce à la programmation audio... En attendant, amusez-vous bien avec les événements !

*Stéphane Peter*

----

SDL Home Page: [libsdl.org](https://www.libsdl.org)

### Encadré 1 : Un programme utilisant les événements.

{% highlight c %}
#include <stdio.h>
#include <stdlib.h>
#include <SDL/SDL.h>

int FilterEvents(const SDL_Event *event) {
  static int boycott = 1;

  /* This quit event signals the closing of the window */
  if ( (event->type == SDL_QUIT) && boycott ) {
printf("Evénement QUIT reçu et filtré. Le prochain quittera l'application.\n");
	boycott = 0;
	return(0);
  }
  if ( event->type == SDL_MOUSEMOTION ) {
	printf("Souris déplacée en (%d,%d)\n",
		   event->motion.x, event->motion.y);
	return(0);
  }
  return(1);
}

int main(int argc, char *argv[])
{
  SDL_Event event;

  /* Initialisation de la librairie */
  if ( SDL_Init(SDL_INIT_VIDEO) < 0 ) {
	fprintf(stderr,
			"Erreur SDL: %s\n", SDL_GetError());
	exit(1);
  }

  atexit(SDL_Quit);
  
/* On ignore les événements du clavier */
  SDL_EventState(SDL_KEYDOWN, SDL_IGNORE);
  SDL_EventState(SDL_KEYUP, SDL_IGNORE);
  
  /* Mise en place du filtre pour le reste des événements */
  SDL_SetEventFilter(FilterEvents);
  
  /* Ouverture d'une fenêtre pour pouvoir intercepter les événements */
  if ( SDL_SetVideoMode(640, 480, 8, 0) == NULL ) {
	fprintf(stderr, "Ne peut changer le mode video 640x480x8: %s\n",
			SDL_GetError());
	exit(1);
  }

  /* Boucler jusqu'à l'appui simultané de Esc et de l'un des boutons de la souris  
*/
  while ( SDL_WaitEvent(&event) >= 0 ) {
	switch (event.type) {
	case SDL_ACTIVEEVENT: {
	  if ( event.active.state & SDL_APPACTIVE ) {
		if ( event.active.gain ) {
		  printf("Application activée\n");
		} else {
		  printf("Application iconifiée\n");
		}
	  }
	}
	break;
	
	case SDL_MOUSEBUTTONDOWN: {
	  Uint8 *keys;
	  
	  keys = SDL_GetKeyState(NULL);
	  if ( keys[SDLK_ESCAPE] == SDL_PRESSED ) {
		printf("Bye bye...\n");
		exit(0);
	  }
	  printf("Bouton de la souris pressé: %d\n", event.button.button);
	}
	break;
	
	case SDL_QUIT: {
	  printf("Evénement SDL_QUIT reçu, fin du programme\n");
	  exit(0);
	}
	break;
	}
  }
  return 1;
}
{% endhighlight %}

