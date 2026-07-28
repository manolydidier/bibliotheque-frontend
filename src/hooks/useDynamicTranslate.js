// src/hooks/useDynamicTranslate.js
//
// Traduit automatiquement (via Google, moteur src/utils/dynamicTranslate.js)
// le contenu DYNAMIQUE (BDD/API) d'un conteneur, en suivant la langue i18n
// courante. Le texte statique de l'UI n'est pas concerné : il est déjà géré
// nativement par i18next/useTranslation dans les composants.

import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { SOURCE_LANG, translateSubtree, observeSubtree, prewarmTranslation } from '../utils/dynamicTranslate';

const OTHER_LANG = 'en'; // seules langues supportées actuellement : fr (source) / en

/**
 * @param {() => (Element|null|undefined)} getRoot
 *   Retourne l'élément racine à traduire. Peut pointer vers le body d'une
 *   iframe (contenu CMS) ou un simple ref de conteneur (article, slide...).
 * @param {any[]} deps
 *   Dépendances additionnelles qui doivent déclencher une re-traduction
 *   (ex: id de l'article chargé, tick de chargement de l'iframe).
 */
export default function useDynamicTranslate(getRoot, deps = []) {
  const { i18n } = useTranslation();
  const cleanupRef = useRef(() => {});

  // ✅ Pré-chauffe la traduction dès que le contenu apparaît (indépendamment
  // de la langue affichée) pour que le clic sur le sélecteur soit instantané.
  useEffect(() => {
    if ((i18n.language || SOURCE_LANG) === OTHER_LANG) return; // déjà en cours d'application, inutile
    const root = getRoot();
    if (root) prewarmTranslation(root, OTHER_LANG);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    const root = getRoot();
    if (!root) return undefined;

    const targetLang = i18n.language || SOURCE_LANG;
    let cancelled = false;

    cleanupRef.current();
    cleanupRef.current = () => {};

    translateSubtree(root, targetLang).then(() => {
      if (cancelled) return;
      cleanupRef.current = observeSubtree(root, () => i18n.language || SOURCE_LANG);
    });

    return () => {
      cancelled = true;
      cleanupRef.current();
      cleanupRef.current = () => {};
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language, ...deps]);
}
