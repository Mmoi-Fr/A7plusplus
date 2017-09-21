/**
* @file TimeEvents.js
* @brief Script des évenements des zones temporelles
*/


/**
* @fn pre_timeclick Active les différents éléments graphiques liés au clic
* @param {number} seqNumber Numéro de la séquence
*/
function pre_timeclick(seqNumber)
{
    // Récupération des éléments utiles
    var line     = getTextCell(seqNumber).parentElement;
    var timeCell = line.children[page.lock + 4];
    var textCell = line.lastElementChild;

    // Récupération de l'état des cellules
    var timeState = getStateOfTimeCell(timeCell);

    // Si la cellule possède un grand indicateur
    if (timeState === 'opened')
    {
        // Lui retire
        removeBigIndicator(timeCell);
    }

    // Récupère les durées
    var timeCodes = timeCell.getText().split(' --> ');

    // Retire les durées
    timeCell.childNodes[0].remove();


    // Crée et ajoute les utilitaires d'édition
    addTimeUtils(timeCell, seqNumber, timeCodes);


    // Actualise le RS Rating et le compte des caractères
    updateRsRatingAndCharCount(seqNumber);
}


/**
* @fn pre_updatetime Traite le texte avant l'envoi et change la classe de la cellule
* @param {number} seqNumber Numéro de la séquence
*/
function pre_updatetime(seqNumber)
{
    // Regex pour matcher HH:MM:SS,mmm où H,M,S et m sont des chiffres (exemple : 00:23:43,214)
    var pattern = /^\d{2}:\d{2}:\d{2},\d{3}$/;

    // Récupère les information utiles
    var timeCell  = getTimeCell(seqNumber);
    var timeStart = timeCell.firstElementChild.children[1];
    var timeEnd   = timeCell.firstElementChild.children[6];

    // Remplace les points par des virgules dans les champs de temps
    timeStart.value = timeStart.value.replace(/\./, ',');
    timeEnd.value   =   timeEnd.value.replace(/\./, ',');

    // Vérification de la syntaxe des timings
    if (!pattern.test(timeStart.value) || !pattern.test(timeEnd.value))
    {
        alert(loc.badTempCodes);
        return;
    }

    // Vérification de la continuité des temps
    if (getDurationFromTime([timeStart.value, timeEnd.value]) < 0)
    {
        alert(loc.negativeTime);
        return;
    }

    // Les temps n'ont pas changé
    if (timeStart.value === timeStart.defaultValue && timeEnd.value === timeEnd.defaultValue)
    {
        timeCancel(seqNumber);
        return;
    }

    // Récupère es informations de la page
    var subInfo = page.queryInfos;

    // Prépare les données
    var params = 'id='         + subInfo.id +
                 '&fversion='  + subInfo.fversion +
                 '&lang='      + subInfo.lang +
                 '&seqnumber=' + seqNumber +
                 '&stime='     + encodeURIComponent(timeStart.value) +
                 '&etime='     + encodeURIComponent(timeEnd.value),
        url    = '/ajax_editTime.php',
        action = 'POST';

    // Indique que c'est en envoi
    resetToLoadingImage(timeCell);

    // Effectue l'envoi des données
    ajax(action, url, params, post_updateTime, seqNumber, [timeStart.value, timeEnd.value], [timeStart.defaultValue, timeEnd.defaultValue]);
}


/**
* @fn post_updateTime Place le temps dans sa cellule ou réouvre l'édition
* @param {number} seqNumber Numéro de la séquence
* @param {Array.<string>} confirmedTime Temps confirmé par le serveur ou temps à envoyer en cas d'erreur
* @param {boolean} isError Si la requête a échoué
* @param {Array.<string>} defaultValue Optionnel : valeur par defaut du temps en cas d'erreur
*/
function post_updateTime(seqNumber, confirmedTime, isError, defaultValue)
{
    // Récupération de la cellule
    var timeCell = getTimeCell(seqNumber);

    // Si la page a été changée
    if (timeCell === null)
        return;


    if (!isError)
    {
        // Récupération de la deuxième cellule
        var textCell = getTextCell(seqNumber);

        // Récupération de l'état
        var textState = getStateOfTextCell(textCell);

        // Mise en forme
        timeCell.className = timeCell.className.replace(/timeClicked /, 'timeInitial ');

        // Si le texte est ouvert
        if (textState === 'clicked')
        {
            // Ajoute le grand indicateur
            addBigIndicator(timeCell);
        }
        else
        {
            // Sinon, il n'y a plus d'indicateur
            timeCell.className = timeCell.className.replace(/timeWithIndicator /, 'timeWithoutIndicator ');
        }

        // Remplace tout simplement par le temps
        timeCell.firstElementChild.outerHTML = confirmedTime.substr(19, confirmedTime.length - 7);

        // Actualise les compteurs
        updateRsRatingAndCharCount(seqNumber);

        // Activation de onclick après 10 ms pour laisser passer le clic courant
        setTimeout(function(){
            timeCell.setAttribute('onclick', 'pre_timeclick(' + seqNumber + ')');
        }, 10);
    }
    else
    {
        // Change le temps de la cellule
        timeCell.setText(confirmedTime[0] + ' --> ' + confirmedTime[1]);

        // Réouvre l'édition
        pre_timeclick(seqNumber);

        // Récupération des entrées
        var timeStart = timeCell.firstElementChild.children[1];
        var timeEnd   = timeCell.firstElementChild.children[6];

        // Remet les valeurs par défaut
        timeStart.defaultValue = defaultValue[0];
        timeEnd.defaultValue   = defaultValue[1];
        timeStart.value        = confirmedTime[0];
        timeEnd.value          = confirmedTime[1];

        // Mise en forme
        timeCell.firstElementChild.setAttribute('class', 'ajaxError');
        timeCell.firstElementChild.setAttribute('title', loc.ajaxErrorOccurred);
    }
}


/**
* @fn timeRestore Restaure le temps de la séquence
* @param {number} seqNumber Numéro de la séquence
*/
function timeRestore(seqNumber)
{
    // Récupère les information utiles
    var timeCell  = getTimeCell(seqNumber);
    var timeStart = timeCell.firstElementChild.children[1];
    var timeEnd   = timeCell.firstElementChild.children[6];

    // On restaure les valeurs
    timeStart.value = timeStart.defaultValue;
    timeEnd.value   = timeEnd.defaultValue;

    // On se place sur l'entrée du début
    timeStart.focus();

    // Rafraichissement du RS Rating
    updateRsRatingAndCharCount(seqNumber);
}


/**
* @fn timeCancel Annule les modifications et referme la cellule
* @param {number} seqNumber Numéro de la séquence
*/
function timeCancel(seqNumber)
{
    // Récupère les information utiles
    var textCell = getTextCell(seqNumber);
    var timeCell = getTimeCell(seqNumber);

    // Récupération de l'état des cellules
    var textState = getStateOfTextCell(textCell);

    // Récupère le span
    var timeSpan = timeCell.firstElementChild;

    // Récupère les valeurs temporelles de base
    var begin = timeSpan.children[1].defaultValue;
    var end   = timeSpan.children[6].defaultValue;

    // On supprime les utilitaires
    removeTimeUtils(timeCell);

    // Si c'est ouvert
    if (textState === 'clicked')
    {
        // Ajoute le grand indicateur
        addBigIndicator(timeCell);
    }

    // On réécrit les valeurs dans la cellule
    timeCell.insertBefore(document.createTextNode(begin + ' --> ' + end), timeCell.firstElementChild);

    // Actualise le RS Rating
    updateRsRatingAndCharCount(seqNumber);

    // Activation de onclick après 10 ms pour laisser passer le clic courant
    setTimeout(function(){
        timeCell.setAttribute('onclick', 'pre_timeclick(' + seqNumber + ')');
    }, 10);
}