---
layout: article
title: Programmer des jeux sous Linux avec SDL
---
## Partie II: Programmation graphique

Dans le numéro précédent, nous avons abordé les différents aspects de la librairie SDL. Cet article se concentre davantage sur la partie graphique de SDL qui est, sans aucun doute, la plus importante pour la programmation de jeux.

SDL repose sur le concept de "surface" (le type structuré `SDL_Surface`) qui sert à représenter un ensemble planaire de pixels. Chaque surface a ses caractéristiques propres (taille, bits par pixel, etc.). L'interaction avec l'écran principal (qui peut être une fenêtre X11) se fait par l'intermédiaire d'un objet `SDL_Surface`. Il en est de même pour la manipulation du curseur de la souris, des sprites, icônes, etc...

### Obtenir les caractéristiques du matériel

Avant d'ouvrir une nouvelle fenêtre, il est toujours bon de savoir quelles sont les caractéristiques graphiques utilisées sur la machine. Celles-ci indiquent particulièrement le format des pixels (nombre de bits par pixels, et la répartition des composantes RGB), mais aussi si les primitives supportées par SDL bénéficient d'une accélération matérielle dans le contexte actuel. Ces caractéristiques sont obtenues par la fonction `SDL_GetVideoInfo()` qui renvoie un pointeur sur une structure `SDL_VideoInfo`. Cette structure fournit les informations nécessaires. Le programme de l'encadré 1 teste certaines de ces caractéristiques.

### Activer un mode vidéo

Le format vidéo renvoyé par la fonction `SDL_GetVideoInfo()` indique le format "idéal" pour le contexte d'exécution. Il est toujours possible de demander à SDL d'ouvrir une surface avec des caractéristiques différentes, la librairie faisant son possible pour satisfaire l'utilisateur avec, toutefois, une certaine perte de performances. L'activation d'un mode vidéo se fait par l'intermédiaire de la fonction `SDL_SetVideoMode()` dont le prototype est le suivant :

`SDL_Surface *SDL_SetVideoMode(int width, int height, int bpp, Uint32 flags);`

Son utilisation est assez évidente. La valeur du paramètre "flags" est une combinaison des valeurs suivantes :

* **SDL_HWSURFACE** : La surface sera allouée en mémoire vidéo (si possible). Chaque accès direct à la mémoire vidéo devra être entouré d'appels à `SDL_LockSurface()` et `SDL_UnlockSurface()` pour garantir un accès exclusif.
* **SDL_HWPALETTE** : Pour les modes 8 bits, permet de garantir que SDL appliquera exactement les couleurs fournies à `SDL_SetColors()` pour les changements de palette, et non une approximation.
* **SDL_FULLSCREEN** : Demande un mode plein écran. Sous X11, et si les permissions suffisantes sont accordées, l'extension DGA permet de prendre le contrôle de l'écran.
* **SDL_DOUBLEBUF** : Active le double-buffering. Deux pages vidéo seront allouées en mémoire (si possible), et l'utilisateur pourra passer de l'une à l'autre, grâce à la fonction `SDL_Flip()`. Cette technique est employée pour éviter des clignotements désagréables pour les jeux rafraîchissant de larges portions de l'écran rapidement.

Si tout s'est bien passé, un pointeur non nul sur une structure `SDL_Surface` est renvoyé. Nous vous conseillons cependant de toujours vérifier si le mode désiré est disponible avant d'essayer de l'activer : la fonction `SDL_VideoModeOK()` est faite pour cela. Il est également possible d'obtenir une liste des modes vidéo disponibles, grâce à `SDL_ListModes()`. Cette fonction renvoie NULL, si toute taille d'écran est valide (ce qui est le cas pour une fenêtre X11!).

### Allocation de surfaces supplémentaires

Il est pratiquement toujours nécessaire d'allouer des surfaces supplémentaires. Que ce soit pour des objets animés (ou "sprites") ou, tout simplement, pour obtenir un second buffer en mémoire. SDL fait l'abstraction du type de surface et toutes les opérations sur les surfaces fonctionnent de manière uniforme. Il y a cependant certains attributs pour les surfaces qui peuvent s'avérer utiles pour des jeux.

La fonction

`SDL_Surface *SDL_AllocSurface (Uint32 flags, int width, int height, int depth, Uint32 Rmask, Uint32 Gmask, Uint32 Bmask, Uint32 Amask);`

crée une surface de format arbitraire en mémoire. Les paramètres " mask " permettent de spécifier le masque RGB pour le format de pixels de la surface. Par exemple, un mode 24 bits (depth = 24) pourra avoir `Rmask = 0xFF0000, Gmask = 0x00FF00, Bmask = 0x0000FF`. Les flags supportés sont les suivants :

* **SDL_HWSURFACE** : voir plus haut
* **SDL_SWSURFACE** : la surface sera créée en mémoire principale
* **SDL_SRCCOLORKEY** : indique que la surface sera transparente, ce qui peut amener SDL à placer la surface en mémoire vidéo de manière à bénéficier d'accélérations matérielles.
* **SDL_SRCALPHA** : idem pour l'alpha blending (voir ci-dessous)

Les surfaces allouées par `SDL_AllocSurface()` doivent être libérées par `SDL_FreeSurface()`. Il est également possible de créer une surface à partir d'un fichier BMP (`SDL_LoadBMP()`), voire de sauver le contenu d'une surface dans un fichier BMP (`SDL_SaveBMP()`) (*NDLR* : on peut se demander pourquoi l'auteur a choisi un format inventé pour Windows pour cela...).

### Surfaces transparentes

SDL permet de créer des surfaces transparentes, par la définition d'une couleur clé pour la transparence. La fonction

`SDL_SetColorKey(SDL_Surface *surface, Uint 32 flag, Uint32 key)`

est utilisée à cet effet. La couleur "key" sera définie comme la couleur transparente dans la surface et les pixels de cette couleur ne seront pas affectés lors de la copie de la surface. Le paramètre "flag" doit être `SDL_SRCCOLORKEY` pour changer la valeur de la clé. Une valeur nulle désactive la transparence. La transparence est principalement utilisée pour réaliser des sprites dans les jeux : un sprite n'est qu'un bloc de pixels avec une couleur transparente, ce qui correspond à une surface SDL transparente.

SDL supporte également " l'alpha blending ". Il s'agit d'une semi-transparence, une valeur "alpha" donnant le degré de transparence de la surface. La fonction

`SDL_SetAlpha(SDL_Surface *surface, Uint32 flag, Uint8 alpha)`

est utilisée à cet effet. `alpha` varie entre 0 (opaque) et 255 (complètement transparent, aucun pixel ne sera affiché !). Tout comme pour `SDL_SetColorKey()`, une valeur de 0 pour le flag désactive l'alpha blending et `SDL_SRCALPHA` l'active. L'alpha blending permet de réaliser des textures transparentes, comme si l'image était projetée sur un fond différent.

### Opérations sur les surfaces

Quand une surface est allouée, le plus simple pour la manipuler est d'utiliser directement son pointeur "pixels" qui fournit un accès total à la mémoire associée. Si la surface est allouée en mémoire vidéo, il faudra cependant veiller à entourer les accès directs par des appels à `SDL_LockSurface()` et `SDL_UnlockSurface()`. Ceci est nécessaire afin de garantir un accès exclusif à la mémoire vidéo par l'application. En effet, SDL, tout comme X11, peut essayer d'écrire en même temps en mémoire, ce qui peut avoir des effets indésirables.

Par exemple :

{% highlight c %}
...
SDL_Surface *sf = SDL_AllocSurface(SDL_HWSURFACE,320,200,32,0xFF0000,0xFF00,0xFF
,0);
int *ptr = (int *)sf->pixels;
SDL_LockSurface(sf);
...
/* Accès à la mémoire vidéo par l'intermédiaire de ptr */
...
SDL_UnlockSurface(sf);
{% endhighlight %}

Lorsqu'une surface n'est pas en mémoire vidéo et que l'on y accède néanmoins directement via le pointeur, il faut veiller à actualiser périodiquement l'écran à partir du contenu du buffer, par la fonction `SDL_UpdateRect()` ou `SDL_UpdateRects()` pour un ensemble de zones précises à actualiser. Les verrouillages de la surface ne sont alors plus nécessaires. SDL fournit également des primitives de bases sur les surfaces qui sont, si possible, accélérées par le matériel. On trouve, notamment, la copie de bloc ("blitting"), via :

`int SDL_BlitSurface(SDL_Surface *src, SDL_Rect *srcrect, SDL_Surface *dst, SDL_Rect *dstrect);`

Les arguments précisent une zone dans chaque surface (source et destination). Il faut veiller à ce que les zones soient de tailles égales. Les attributs de transparence et d'alpha blending sont respectés. D'une manière générale, les copies ("blits") entre surfaces sont beaucoup plus rapides lorsque les deux surfaces sont en mémoire vidéo.

On trouve également le remplissage de rectangles d'une certaine couleur (`SDL_FillRect()`), la conversion de surfaces dans un format de pixels différent (`SDL_ConvertSurface()`). Il est également possible de définir une zone de clipping pour chaque surface via `SDL_SetClipping()`. Toutes les opérations sur cette surface seront restreintes aux coordonnées de cette zone sauf, bien entendu, en cas d'accès direct à la mémoire.

### Curseurs de souris

SDL gère également l'apparence du curseur de souris. Sous X11, la gestion est déléguée au serveur X, mais dans les modes vidéo plein écran (DGA), un curseur de souris logiciel (dessiné et géré par SDL) est utilisé. Un type `SDL_Cursor` est défini ; on crée un nouveau curseur, grâce à la fonction suivante :

`SDL_Cursor *SDL_CreateCursor(Uint8 *data, Uint8 *mask, int w, int h, int hot_x, int hot_y);`

`w` et `h` sont, respectivement, la largeur et la hauteur du curseur (multiples de 8). On fournit également les coordonnées du " hot spot " à l'intérieur du curseur; il s'agit du point considéré comme le centre du curseur. Par exemple, pour un curseur en forme de viseur, le hot spot sera le point central du viseur. Les paramètres "data" et "mask" sont des masques binaires définissant la forme du curseur monochrome. Les combinaisons pour chaque bit sont les suivantes :


data	|	Mask
0			|	1		|	Blanc
1			|	1		|	Noir
0			|	0		|	Transparent
1			|	0		|	Couleur inversée sous le curseur (si possible)


Les curseurs alloués de cette façon doivent être libérés par `SDL_FreeCursor()`. L'affectation d'un curseur se fait par l'intermédiaire de `SDL_SetCursor()`. Le curseur peut être caché ou affiché par des appels à `SDL_ShowCursor(int toggle) ;` une valeur de 1 pour le paramètre indique que le curseur doit être affiché. Il est également possible de déplacer le curseur à un point précis, via `SDL_WarpMouse(x,y)`.

### Interaction avec le Window manager

Lorsque SDL est utilisé dans un environnement fenêtré (X11 ou Windows), certaines interactions avec le gestionnaire de fenêtres sont possibles. On trouve :

`SDL_WM_SetCaption(const char *title, const char *icon) :`

change le titre de la fenêtre et le titre de l'icône. Les paramètres courants peuvent être obtenus par `SDL_WM_GetCaption()`.

`SDL_WM_SetIcon(SDL_Surface *icon, Uint8 *mask) :`

Change l'icône associée à la fenêtre, à partir d'une surface SDL. Le masque indique la transparence de l'icône d'une manière similaire aux curseurs. Cette fonction doit être appelée avant `SDL_SetVideoMode()`.

### Programme d'exemple

Voici un programme simple SDL (cf. l'encadré 2) mettant en application certaines des fonctions vues plus haut. Le programme prend en argument une image au format BMP, la charge, l'affiche et fait défiler un carré bleu de 30 pixels de côté, de gauche à droite sur l'image. Notez l'utilisation de plusieurs surfaces en mémoire et l'utilisation des informations fournies par SDL afin de garantir le fonctionnement du programme dans tout environnement. Il n'y a aucune gestion des événements (que nous verrons plus tard !), donc, il vous faut patiemment attendre la fin du programme pour le moment.

### Compilation de programmes SDL

A titre de référence, une ligne de commande typique pour compiler l'un des programmes SDL donnés en exemple serait, en admettant que SDL ait été installé dans `/usr/local` et ait été compilé avec les options par défaut (version dynamique, multithread) :

`gcc -o prog prog.c -I/usr/local/include -lSDL -ldl -lpthread`

*(Note: la méthode de compilation a légèrement changé depuis SDL 1.0)* Dans le prochain numéro, nous aborderons la programmation des événements avec SDL et nous verrons comment intégrer celle-ci avec la programmation graphique vue dans cet article.

*Stéphane Peter*

----

Pour plus de détails: [libsdl.org](http://www.libsdl.org/)

----

### Encadré 1

{% highlight c %}
#include <SDL/SDL.h>
#include <stdio.h>

int main(void)
{
   const SDL_VideoInfo *vi;

   if(SDL_Init(SDL_INIT_VIDEO)<0)
	   printf("Erreur: %s\n", SDL_GetError());
   vi = SDL_GetVideoInfo();

   printf("Format vidéo: %d bpp. En fenêtre: %d\n",
		  vi->vfmt->BitsPerPixel, vi->wm_available); 
   return 0;
}
{% endhighlight %}


### Encadré 2

{% highlight c %}
#include <stdio.h>
#include <SDL/SDL.h>

int main(int argc, char **argv)
{
  SDL_Surface *screen;
  SDL_Surface *img, *back;
  SDL_Rect coords, carre;
  const SDL_VideoInfo *vi;
  Uint32 bleu;
  
  if(argc<2){
	fprintf(stderr,"Veuillez fournir un fichier BMP en paramètre.\n");
	exit(1);
  }

  /* Initialisation de SDL */
  if ( SDL_Init(SDL_INIT_VIDEO) < 0 ) {
	fprintf(stderr,"Erreur SDL: %s\n", SDL_GetError());
	exit(1);
  }
  atexit(SDL_Quit); /* Pour sortir proprement */

  img = SDL_LoadBMP(argv[1]); /* Charge l'image */
  if(!img){
	fprintf(stderr,"Impossible de charger l'image %s: %s\n", argv[1], SDL_GetError());
	exit(1);
  }

  /* Alloue un second buffer de la même taille que l'image */
  back = SDL_AllocSurface(SDL_SWSURFACE, img->w, img->h, 
                          img->format->BitsPerPixel,
                          img->format->Rmask, img->format->Gmask, 
                          img->format->Bmask,img->format->Amask);

  vi = SDL_GetVideoInfo();
  if(vi && vi->wm_available) /* Change les titres */
	SDL_WM_SetCaption("Demo SDL", "Icone SDL");

  /* Initialise un mode vidéo idéal pour cette image */
  screen = SDL_SetVideoMode(img->w, img->h, 
                            img->format->BitsPerPixel, 
                            SDL_FULLSCREEN);
  if(!back || !screen){
	fprintf(stderr, "Impossible d'allouer une surface: %s\n", argv[1],
              SDL_GetError());
	exit(1);
  }

  bleu = SDL_MapRGB(screen->format, 0, 0, 255);
  coords.x = coords.y = 0;
  coords.w = img->w; coords.h = img->h;
  carre.w = carre.h = 30;
  carre.y = (img->h - 30) / 2;

  for(carre.x=0; carre.x<img->w; carre.x++){
	/* Copie l'image originale dans le buffer */
	SDL_BlitSurface(img, &coords, back, &coords);
	/* On fait défiler un carré bleu de 30 pixels de côté */
	SDL_FillRect(back, &carre, bleu);
	/* On envoie le tout sur l'écran et on actualise */
	SDL_BlitSurface(back, &coords, screen, &coords);
	SDL_UpdateRects(screen,1,&coords);
  }
  return 0;
}
{% endhighlight %}
