---
layout: article
title: Programmer des jeux sous Linux avec SDL <br/>Partie V
section: Linux Programming
tags:
- linux
- programming
- SDL
locale: fr_FR
published: Planète Linux numéro 7
---
## Fonctions utilitaires

Pour le dernier opus de cette série d'articles d'initiation à SDL, nous allons aborder tout ce (threads, gestion du cédérom ...) que nous n'avons pas pu classer dans l'un des articles précédents.

En effet, SDL dispose d'un ensemble de fonctionnalités simples visant à faciliter la tache du programmeur (suivant le paradigme de simplicité cher au *Simple Directmedia Layer*...). La présence de ces fonctions renforce la portabilité des programmes SDL, qui n'ont plus à se tourner vers les équivalents de chaque système. SDL dispose de fonctions utilitaires pour la programmation multithread (gestion des threads et verrous d'exclusion mutuelle), les timers, la gestion des lecteurs de CDROM, ainsi que diverses commodités pour gérer les différences entre architectures matérielles.

### Threads et mutex

La plupart des programmes modernes reposent, d'une manière ou d'une autre, sur la capacité du système d'exploitation d'opérer en multitâches. Les '*threads*' sont des unités d'exécutions parallèles, tout comme les autres processus du système, à cette différence qu'elles partagent un même espace d'adressage, ce qui facilite grandement la coopération.

SDL propose les mécanismes de base pour la multi-programmation. Ceux-ci reposent sur les threads natives du système (POSIX threads pour Linux et la plupart des Unix). Il est possible de créer de nouvelles threads, par l'intermédiaire des fonctions suivantes :

{% highlight c %}
SDL_Thread *SDL_CreateThread(int (*fn)(void *), void *data);
{% endhighlight %}

Cette fonction crée une nouvelle thread, dont le point d'entrée est la fonction passée en paramètre. La fonction constituant la thread peut prendre un argument optionnel, correspondant à l'argument `data` de `SDL_CreateThread()`. L'exécution de la thread commence immédiatement après l'appel de `SDL_CreateThread()`. La structure `SDL_Thread` est un type opaque utilisé pour manipuler la thread ainsi créée. Il est à noter qu'elle se termine en même temps que la fonction qui la compose...

{% highlight c %}
void SDL_KillThread(SDL_Thread *thread);
{% endhighlight %}

Cette fonction permet de stopper l'exécution d'une thread. D'une manière générale, il vaut mieux éviter d'employer cette fonction qui provoque une fin brutale. Nous vous conseillons d'utiliser les mécanismes de synchronisation décrits ci-dessous, pour terminer proprement son exécution.

{% highlight c %}
void SDL_WaitThread(SDL_Thread *thread, int *status);
{% endhighlight %}

Cette fonction est bloquante, jusqu'à ce que la thread désignée se termine. Le code de retour est ensuite affecté à la variable pointée par `status`. Ce code correspond à la valeur retournée par la fonction exécutée par la thread.

{% highlight c %}
Uint32 SDL_ThreadID(void);
{% endhighlight %}

Cette fonction renvoie un entier positif identifiant la thread en cours d'exécution. SDL ne garantit rien quant à la valeur retournée (si elle correspond à un numéro de processus, par exemple). Par conséquence, son seul usage valide est la comparaison avec d'autres identifiants, par exemple, pour déterminer si vous êtes en train d'exécuter du code dans une thread particulière.

La programmation parallèle ne peut se faire sans les mécanismes de synchronisation de base. SDL fournit des verrous d'exclusion mutuelle ("mutex"), qui permettent principalement de délimiter des sections de code ne pouvant être accédées que par une seule thread à la fois. Fort heureusement, la plupart des autres mécanismes de synchronisation peuvent être implantés à partir de mutex. Reste l'espoir que les futures versions de SDL fournissent d'autres mécanismes plus avancés. L'utilisation des mutex est très simple:

{% highlight c %}
SDL_mutex *SDL_CreateMutex(void);
{% endhighlight %}

Explicite, cette fonction crée un nouveau mutex, identifié par une variable de type `SDL_mutex`.

{% highlight c %}
void SDL_DestroyMutex(SDL_mutex *mutex);
{% endhighlight %}

Utilisez cette fonction pour libérer un mutex préalablement alloué via `SDL_CreateMutex()`.

{% highlight c %}
int SDL_mutexP(SDL_mutex *mutex);
{% endhighlight %}

Cette fonction verrouille le mutex désigné. Si le mutex est déjà verrouillé, cette fonction se met en attente, jusqu'à ce que le mutex ne soit plus verrouillé. La fonction renvoie -1, en cas d'erreur et 0, si tout s'est bien passé.

{% highlight c %}
int SDL_mutexV(SDL_mutex *mutex);
{% endhighlight %}

Contrepartie de la fonction précédente, cette fonction déverrouille un mutex précédemment verrouillé par `SDL_mutexP()`. Cette fonction est non-bloquante et renvoie également -1, en cas d'erreur.

Concrètement, le programmeur 'encadre' les sections de programme ne devant être utilisées que par une thread à la fois (par exemple, pour protéger l'accès à des données communes) par des appels à `SDL_mutexP()` et `SDL_mutexV()`, comme le montre le programme d'exemple de l'encadré 1.

### Gestion du temps

SDL permet également de gérer le temps et de programmer des appels répétitifs à des functions (*timers*).

{% highlight c %}
Uint32 SDL_GetTicks(void);
{% endhighlight %}

Cette fonction, très utile, renvoie le nombre de millisecondes écoulées depuis l'initialisation de SDL.

{% highlight c %}
void SDL_Delay(Uint32 ms);
{% endhighlight %}

Cette fonction bloque le programme pendant 'ms' millisecondes.
SDL 1.0 permet la définition d'un simple timer, autrement dit une fonction appelée à intervalles réguliers. Pour pouvoir utiliser ceux-ci, `SDL_Init()` doit avoir reçu en appel le flag **SDL_INIT_TIMER**. Deux implémentations des timers sont disponibles sur la plupart des systèmes supportés par SDL. Sous Linux et autres systèmes permettant une gestion des événements dans une thread séparée, les timers sont simulés de manière générique depuis cette thread. Dans le cas contraire, tous les systèmes disposent de fonctions natives pour les timers, par l'intermédiaire de `setitimer()` sous Unix, par exemple. Spécialement sous Linux où les timers sont implantés par le biais de signaux, il est fortement recommandé d'utiliser les timers 'threadés', si le programme est lui-même multithreadé, cela étant dû aux problèmes d'interaction entre signaux et threads multiples.

Le prototype de la fonction doit correspondre au type suivant:

{% highlight c %}
typedef Uint32 (*SDL_TimerCallback)(Uint32 interval); 
{% endhighlight %}

La fonction timer est appelée avec, comme argument, la valeur actuelle de l'intervalle d'appel. La fonction est chargée de retourner la valeur du prochain intervalle ou 0, si le timer doit s'arrêter.

La mise en route du timer se fait par l'appel de la fonction suivante :

{% highlight c %}
int SDL_SetTimer(Uint32 interval, SDL_TimerCallback callback);
{% endhighlight %}

La variable `interval` est exprimée en millisecondes. Il ne peut y avoir qu'une seule fonction timer à la fois qui utilise cette fonction. L'arrêt du timer s'effectue par l'appel de `SDL_SetTimer(0,0)`.

Si le programmeur a besoin de plusieurs timers simultanés, il est possible d'utiliser les nouvelles fonctions nouvellement introduites dans SDL 1.1.2, permettant la définition de timers multiples. Il est à noter que ces fonctions ne sont disponibles que si la gestion threadée des événements est disponible.

Le prototype des fonctions timer permet dorénavant de prendre un argument supplémentaire dont la signification est laissée à la charge de l'utilisateur.

{% highlight c %}
typedef Uint32 (*SDL_NewTimerCallback)(Uint32 interval, void *param);
{% endhighlight %}

Le programmeur peut définir autant de timers simultanés qu'il le désire, par l'intermédiaire de la nouvelle fonction `SDL_AddTimer()` :

{% highlight c %}
SDL_TimerID SDL_AddTimer(Uint32 interval, SDL_NewTimerCallback callback, void *param);
{% endhighlight %}

Son utilisation est globalement similaire à `SDL_SetTimer()`, à la différence qu'elle retourne un identifiant pour le timer qui vient d'être défini, afin de pouvoir le référencer par la suite.

Pour arrêter un timer unique, il faut utiliser la fonction `SDL_RemoveTimer()` définie comme suit et qui retourne une valeur booléenne indiquant si tout s'est bien déroulé.

{% highlight c %}
SDL_bool SDL_RemoveTimer(SDL_TimerID id);
{% endhighlight %}

En guise d'illustration, le programme 'testtimer.c' fourni avec SDL et reproduit dans l'encadré 2 démontre comment utiliser ces fonctions.

### Gestion des CDROM

SDL permet de contrôler le ou les lecteur/s de CDROM présents et configurés sur le système (incluant aussi implicitement les lecteurs DVD-ROM). Cela concerne principalement la lecture de pistes audio.

{% highlight c %}
int SDL_CDNumDrives(void);
{% endhighlight %}

Renvoie le nombre de lecteurs installés.

{% highlight c %}
const char *SDL_CDName(int drive);
{% endhighlight %}

Renvoie le nom associé au lecteur numéro 'drive' (le premier lecteur est le numéro 0). Le nom est de la forme `/dev/cdrom` sous Linux. Sous d'autres systèmes, le nom sera vraisemblablement différent (par exemple `D:` sous Windows).

{% highlight c %}
SDL_CD *SDL_CDOpen(int drive);
{% endhighlight %}

Cette fonction renvoie un pointeur permettant de manipuler un lecteur particulier. `NULL` est renvoyé, si une erreur quelconque est survenue.
Le lecteur est libéré par l'appel à la fonction `SDL_CDClose()` définie comme suit:

{% highlight c %}
void SDL_CDClose(SDL_CD *cdrom);
{% endhighlight %}

{% highlight c %}
CDstatus SDL_CDStatus(SDL_CD *cdrom);
{% endhighlight %}

Cette fonction renvoie l'état actuel du lecteur qui peut prendre l'une des valeurs suivantes : **CD_TRAYEMPTY** (pas de disque), **CD_STOPPED** (lecture arrêtée), **CD_PLAYING** (lecture en cours), **CD_PAUSED** (mode pause). Il est recommandé d'utiliser la macro `CD_INDRIVE()` pour déterminer si le CD/DVD est dans le lecteur.

{% highlight c %}
int SDL_CDEject(SDL_CD *cdrom);
{% endhighlight %}

Cette fonction permet d'éjecter un CD sur le lecteur désigné. La valeur retournée est négative, si une erreur est survenue, sinon, nulle.

Les fonctions suivantes permettent de jouer des pistes audio :

{% highlight c %}
int SDL_CDPlay(SDL_CD *cdrom, int start, int length);
int SDL_CDPause(SDL_CD *cdrom);
int SDL_CDResume(SDL_CD *cdrom);
int SDL_CDStop(SDL_CD *cdrom);
{% endhighlight %}

Leur utilisation est évidente d'après leurs noms. Toutes ces fonctions renvoient une valeur nulle, si tout s'est bien passé. La seule chose importante à savoir est que les unités utilisées pour désigner le segment audio à jouer (passé à `SDL_CDPlay`), est en 'frames' audio. `start` est la frame de départ et length est le nombre de frames à jouer. Une 'frame' audio correspond à 1/75ème de seconde pour les CD audio. La macro `CD_FPS` est, par ailleurs, définie à la valeur 75.

Il y a principalement deux moyens d'obtenir l'adresse en frames, à partir des informations dont le programmeur dispose :

A partir d'un temps précis (heure, minutes, secondes). Dans ce cas, il faut utiliser la macro `MSF_TO_FRAMES(m,s,f)`, qui renvoie l'index de la frame correspondant à la minute 'm', seconde 's' plus 'f' frames additionnelles. Autrement dit, pour obtenir l'adresse 5 min. 30 sec. du CD audio, utiliser `MSF_TO_FRAMES(5,30,0)`. Il existe également une macro `FRAMES_TO_MSF()` qui permet d'obtenir les informations de durée, à partir d'un index de frame.

A partir des informations de pistes fournies par SDL dans la structure `SDL_CD` :

{% highlight c %}
typedef struct SDL_CD {
	...
    int numtracks;          /* Nombre de pistes sur le disque */
    int cur_track;          /* Numéro de la piste actuelle  */
    int cur_frame;          /* Numéro de la frame, relative au début de la piste actuelle */
    SDL_CDtrack track[SDL_MAX_TRACKS+1]; /* Informations sur chaque piste */
} SDL_CD;
{% endhighlight %}

Les informations des pistes sont décrites à l'aide de la structure suivante :

{% highlight c %}
typedef struct {
         Uint8 id;               /* Numéro de piste */
         Uint8 type;             /* Type de piste: audio ou données */
         Uint16 length;          /* Longueur de la piste, en frames */
         Uint32 offset;          /* Frame de début de la piste, relative au début du disque */
 } SDL_CDtrack;
 {% endhighlight %}

Ainsi, il est très facile d'obtenir les informations nécessaires pour accéder à une piste précise à partir de SDL_CD, par exemple :

{% highlight c %}
SDL_CD *cd = SDL_CDOpen(0);
SDL_CDPlay(cd, cd->track[3].offset, cd->track[3].length);
{% endhighlight %}

Ce bout de programme jouera la piste audio numéro 3 du disque. Bien entendu, il faudrait normalement vérifier que cette piste existe auparavant...

{% highlight c %}
int SDL_CDPlayTracks(SDL_CD *cdrom, int start_track, int start_frame, int ntracks, int nframes);
{% endhighlight %}

Cette fonction est d'un usage plus simple que `SDL_CDPlay()`. Cette fonction prend en argument un numéro de piste de début, le numéro de la frame à l'intérieur de ladite piste, le nombre de pistes à jouer et un éventuel nombre de frames supplémentaires. Notez que cette fonction évitera automatiquement de jouer les pistes de données non-audio.

### Portabilité entre architectures

Pour faciliter l'écriture de programmes portables entre différentes architectures, SDL propose des mécanismes permettant d'obtenir des informations sur l'architecture utilisée. L'information la plus importante est l'ordre des octets ("endianness"). 

Sur les systèmes Intel et Alpha, les octets de poids faibles sont stockés en premier en mémoire ("little endian"), tandis que d'autres architectures (PowerPC, Sparc), stockent les octets de poids forts en premier ("big endian"). Cette différence est cruciale lorsque des données sont partagées entre architectures, que ce soit par réseau ou par fichiers et il faut veiller à effectuer la conversion appropriée.

Le fichier d'en-tête `SDL_endian.h` définit la macro **SDL_BYTEORDER**, qui peut prendre la valeur soit **SDL_LIL_ENDIAN** ou **SDL_BIG_ENDIAN**, suivant l'ordre des octets du système sur lequel l'application est compilée. Pour effectuer la conversion proprement dite, les fonctions `SDL_Swap16()`, `SDL_Swap32()` et `SDL_Swap64()` permettent de passer d'un ordre à l'autre.

Voilà, cette série d'articles touche à sa fin. Cependant, nous n'avons fait qu'effleurer les possibilités de cette formidable bibliothèque. Nous n'avons que brièvement évoqué les nouveautés introduites dans SDL 1.1, comme la gestion des joysticks ou le support d'*OpenGL*... Et de nouvelles bibliothèques voient encore le jour comme, par exemple, *OpenAL* pour le son 3D... C'est pour cette raison que nous vous donnons rendez-vous pour une nouvelle série d'articles qui aborderont des aspects plus avancés de la programmation de jeux sous Linux !

*Stéphane Peter*

----

### Encadré 1 : Programme d'exemple pour les threads

{% highlight c %}
/* Programme d'exemple d'utilisation des threads et mutex avec SDL */
#include <stdio.h>
#include <SDL_thread.h>
#include <SDL_mutex.h>

SDL_mutex *mut;
int count = 0, running = 1;

int thread(void *p)
{
  int t = (int) p; /* Le numéro de thread est passé en paramètre */
  while(running) {
	SDL_mutexP(mut); /* Début de section critique */
	if(t == 1) /* Thread 1 incrémente le compteur */
	  count ++;
	else /* ... et thread 2 le décrémente */
	  count --;
	printf("Thread %d: Valeur du compteur = %d\n", t, count);
	SDL_Delay(100);
 	SDL_mutexV(mut); /* Fin de section critique */
  }
  return t;
}

int main(void)
{
  SDL_Thread *t1, *t2;
  int r1, r2;

  mut = SDL_CreateMutex();
  t1 = SDL_CreateThread(thread, (void*) 1);
  t2 = SDL_CreateThread(thread, (void*) 2);

  SDL_Delay(10 * 1000); /* Attend 10 secondes */
  running = 0; /* Indique aux threads qu'elles doivent s'arrêter */

  SDL_WaitThread(t1, &r1);
  printf("Thread 1 terminée, code de retour = %d\n", r1);
  SDL_WaitThread(t2, &r2);
  printf("Thread 2 terminée, code de retour = %d\n", r2);

  SDL_DestroyMutex(mut);
  return 0;
}
{% endhighlight %}

### Encadré 2 : Démonstration des 'timers'

{% highlight c %}
#include <stdio.h>
#include "SDL.h"

#define DEFAULT_RESOLUTION	1

static int ticks = 0;

static Uint32 ticktock(Uint32 interval)
{
	++ticks;
	return(interval);
}

static Uint32 callback(Uint32 interval, void *param)
{
  printf("Timer %d : param = %d\n", interval, (int) param);
  return interval;
}

main(int argc, char *argv[])
{
	int desired;
	SDL_TimerID t1, t2, t3;

	if ( SDL_Init(SDL_INIT_TIMER) < 0 ) {
		fprintf(stderr, "Erreur d'initialisation de SDL: %s\n", SDL_GetError());
		exit(1);
	}
	atexit(SDL_Quit);

	/* Démarre le timer */
	desired = 0;
	if ( argv[1] ) {
		desired = atoi(argv[1]);
	}
	if ( desired == 0 ) {
		desired = DEFAULT_RESOLUTION;
	}
	SDL_SetTimer(desired, ticktock);

	printf("Attend 10 secondes\n");
	SDL_Delay(10*1000);

	/* Arrête le timer */
	SDL_SetTimer(0, NULL);

	if ( ticks ) {
		fprintf(stderr,
		"Résolution du timer: desirée = %d ms, effective = %f ms\n",
					desired, (double)(10*1000)/ticks);
	}
	
	printf("Test des timers multiples...\n");
	t1 = SDL_AddTimer(100, callback, (void*)1);
	if(!t1)
	  fprintf(stderr,"Impossible de créer le timer 1!\n"),
	t2 = SDL_AddTimer(50, callback, (void*)2);
	if(!t2)
	  fprintf(stderr,"Impossible de créer le timer 2!\n"),
	t3 = SDL_AddTimer(233, callback, (void*)3);
	if(!t3)
	  fprintf(stderr,"Impossible de créer le timer 3!\n"),
	
	printf("Attend 10 secondes\n");
	SDL_Delay(10*1000);

	printf("Arrêt du timer 1 et on continue pour 5 secondes de plus.\n");
	SDL_RemoveTimer(t1);

	SDL_Delay(5*1000);

	SDL_RemoveTimer(t2);
	SDL_RemoveTimer(t3);

	exit(0);
}
{% endhighlight %}
