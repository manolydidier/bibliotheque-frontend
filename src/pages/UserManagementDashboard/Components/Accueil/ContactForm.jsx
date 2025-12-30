// src/pages/UserManagementDashboard/Components/Accueil/ContactForm.jsx
import React, { useState, useEffect, useRef } from "react";
import { FiSend } from "react-icons/fi";
import api from "../../../../services/api";

/**
 * Génère un challenge anti-robot plus intelligent
 * - Calculs (addition, soustraction, multiplication)
 * - Question logique sur les jours
 * - Suite numérique simple
 * - Recopie de mots (avec accents)
 */
function generateHumanChallenge() {
  const modes = ["math", "logicDay", "sequence", "word"];
  const mode = modes[Math.floor(Math.random() * modes.length)];

  // 🔢 Math : +, -, ×
  if (mode === "math") {
    const a = Math.floor(Math.random() * 8) + 2; // 2–9
    const b = Math.floor(Math.random() * 8) + 2; // 2–9
    const operators = ["+", "-", "×"];
    const op = operators[Math.floor(Math.random() * operators.length)];

    let expected;
    switch (op) {
      case "+":
        expected = a + b;
        break;
      case "-":
        expected = a - b;
        break;
      case "×":
        expected = a * b;
        break;
      default:
        expected = a + b;
    }

    return {
      type: "math",
      a,
      b,
      op,
      question: `Combien font ${a} ${op} ${b} ?`,
      expected: String(expected),
    };
  }

  // 📅 Logique sur les jours
  if (mode === "logicDay") {
    const days = [
      "lundi",
      "mardi",
      "mercredi",
      "jeudi",
      "vendredi",
      "samedi",
      "dimanche",
    ];
    const baseIndex = Math.floor(Math.random() * days.length);
    const offset = Math.floor(Math.random() * 6) + 1; // 1–6 jours
    const baseDay = days[baseIndex];
    const resultDay = days[(baseIndex + offset) % days.length];

    return {
      type: "logicDay",
      baseDay,
      offset,
      question: `Si aujourd'hui est ${baseDay}, quel jour sera-t-il dans ${offset} jour(s) ? (en toutes lettres, en français)`,
      expected: resultDay,
    };
  }

  // 🔢 Suite numérique
  if (mode === "sequence") {
    // Suite arithmétique simple (ex : 2, 4, 6, 8, ?)
    const start = Math.floor(Math.random() * 5) + 1; // 1–5
    const step = [1, 2, 3, 4][Math.floor(Math.random() * 4)];
    const seq = [start, start + step, start + 2 * step, start + 3 * step];
    const expected = start + 4 * step;

    return {
      type: "sequence",
      sequence: seq,
      question: `Complétez la suite : ${seq.join(", ")}, ?`,
      expected: String(expected),
    };
  }

  // ✍️ Mot à recopier, avec accents
  const words = [
    "Madagascar",
    "safidy",
    "bibliothèque",
    "zébu",
    "fihavanana",
    "fiarahamonina",
    "tanindrazana",
    "hasina",
    "voahangy",
    "mahery",
  ];
  const word = words[Math.floor(Math.random() * words.length)];

  return {
    type: "word",
    word,
    question: "Recopiez exactement ce mot en minuscules :",
    expected: word.toLowerCase(),
  };
}

/**
 * Calcule un score de suspicion 0–100 basé sur le comportement
 * - Vitesse de remplissage
 * - Absence de mouvements souris
 * - Absence de frappes clavier
 * - Absence de focus
 * - Peu d'interactions
 */
function computeSuspicionScore(elapsedMs, behavior) {
  let score = 0;

  // ⏱ Vitesse de remplissage
  // < 5 s = suspect (30 points)
  if (elapsedMs < 5000) {
    score += 30;
  }

  // 🖱 Mouvements de souris
  if (behavior.mouseMoves === 0) {
    score += 25;
  }

  // ⌨️ Frappes clavier
  if (behavior.keyPresses === 0) {
    score += 20;
  }

  // 🔍 Focus (passage d'un champ à l'autre)
  if (behavior.focusEvents < 2) {
    score += 15;
  }

  // ⚡ Interactions globales
  if (behavior.interactions < 3) {
    score += 10;
  }

  return Math.min(score, 100);
}

/**
 * Formulaire de contact public sécurisé (anti-bots + validations)
 */
export default function ContactForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    type: "",
    message: "",
    consent: false,
    company: "", // 🔒 honeypot (robot)
    website: "", // 🔒 second honeypot (robot)
    humanAnswer: "", // 🔒 réponse à la question anti-bot
  });

  // Challenge anti-robot
  const [challenge] = useState(() => generateHumanChallenge());

  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const [statusMessage, setStatusMessage] = useState("");

  // temps de début pour détecter les bots ultra rapides
  const [startTime] = useState(() => Date.now());

  // 📊 Analyse comportementale (stockée dans un ref pour éviter des re-renders)
  const behaviorRef = useRef({
    mouseMoves: 0,
    keyPresses: 0,
    focusEvents: 0,
    interactions: 0,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    // On nettoie l'erreur de ce champ dès que l'utilisateur tape
    setErrors((prev) => ({
      ...prev,
      [name]: undefined,
    }));
  };

  const validate = () => {
    const newErrors = {};

    if (!form.name.trim()) newErrors.name = "Le nom complet est requis.";
    if (!form.email.trim()) {
      newErrors.email = "L’adresse e-mail est requise.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Adresse e-mail invalide.";
    }
    if (!form.subject.trim()) newErrors.subject = "Le sujet est requis.";
    if (!form.type) newErrors.type = "Veuillez sélectionner un type de demande.";
    if (!form.message.trim() || form.message.trim().length < 10) {
      newErrors.message =
        "Merci de détailler un peu votre demande (au moins 10 caractères).";
    }
    if (!form.consent) {
      newErrors.consent =
        "Vous devez accepter le traitement de vos données pour envoyer le message.";
    }

    // 🔒 question anti-bot (challenge unifié)
    const rawAnswer = form.humanAnswer.trim();
    if (!rawAnswer) {
      newErrors.humanAnswer =
        "Merci de répondre au test pour confirmer que vous êtes humain.";
    } else {
      const normalizedAnswer = rawAnswer.toLowerCase();
      const expected = String(challenge.expected).toLowerCase();

      if (normalizedAnswer !== expected) {
        newErrors.humanAnswer =
          "Réponse incorrecte au test anti-robot. Merci de réessayer.";
      }
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("idle");
    setStatusMessage("");
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const elapsed = Date.now() - startTime;

    // 🎯 Score de suspicion basé sur le comportement
    const suspicionScore = computeSuspicionScore(elapsed, behaviorRef.current);
    // (Optionnel) debug console
    // console.log("Suspicion score:", suspicionScore, behaviorRef.current, "elapsed:", elapsed);

    if (suspicionScore > 50) {
      setStatus("error");
      setStatusMessage(
        "Votre comportement ressemble à celui d’un robot. Merci de remplir le formulaire normalement et de réessayer."
      );
      return;
    }

    // 🔒 double honeypot : si rempli, on ne fait rien côté front.
    if (
      (form.company && form.company.trim().length > 0) ||
      (form.website && form.website.trim().length > 0)
    ) {
      console.warn(
        "Honeypot rempli (probable robot). On ignore l’envoi côté front."
      );
      setStatus("success"); // on peut faire semblant de succès pour le bot
      setStatusMessage("Votre message a bien été pris en compte.");
      return;
    }

    setStatus("submitting");

    try {
      // On ne transmet pas humanAnswer ni les honeypots au backend
      const { humanAnswer, company, website, ...payload } = form;

      // await api.post("/public/contact", payload);
        const start = Date.now();
        // ... au submit
        await api.post("/public/contact", payload, {
          headers: { "X-Form-Start": String(start) }
        });

      setStatus("success");
      setStatusMessage(
        "Votre message a bien été envoyé. Nous reviendrons vers vous rapidement."
      );
      // Reset du formulaire (challenge inchangé)
      setForm({
        name: "",
        email: "",
        subject: "",
        type: "",
        message: "",
        consent: false,
        company: "",
        website: "",
        humanAnswer: "",
      });
      setErrors({});
    } catch (err) {
      console.error("Erreur lors de l’envoi du formulaire de contact :", err);
      setStatus("error");
      setStatusMessage(
        "Une erreur est survenue lors de l’envoi du message. Merci de réessayer plus tard."
      );
    } finally {
      setStatus((prev) => (prev === "submitting" ? "idle" : prev));
    }
  };

  const isSubmitting = status === "submitting";

  // 🔁 Message de succès éphémère (disparaît après quelques secondes)
  useEffect(() => {
    if (status === "success" && statusMessage) {
      const timer = setTimeout(() => {
        setStatus("idle");
        setStatusMessage("");
      }, 8000); // 8 secondes

      return () => clearTimeout(timer);
    }
  }, [status, statusMessage]);

  // 🕵️ Suivi des interactions (analyse comportementale)
  useEffect(() => {
    const handleMouseMove = () => {
      const b = behaviorRef.current;
      b.mouseMoves += 1;
      b.interactions += 1;
    };

    const handleKeyDown = () => {
      const b = behaviorRef.current;
      b.keyPresses += 1;
      b.interactions += 1;
    };

    const handleFocusIn = () => {
      const b = behaviorRef.current;
      b.focusEvents += 1;
      b.interactions += 1;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("focusin", handleFocusIn);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("focusin", handleFocusIn);
    };
  }, []);

  return (
    <section className="bg-white/55 backdrop-blur-2xl border border-white/70 rounded-3xl shadow-[0_16px_40px_rgba(15,23,42,0.05)] p-6 sm:p-8 lg:p-9">
      {/* Bandeau de statut */}
      {status !== "idle" && statusMessage && (
        <div
          className={`mb-5 rounded-2xl px-4 py-3 text-xs sm:text-sm border ${
            status === "success"
              ? "bg-emerald-50/80 border-emerald-200 text-emerald-800"
              : "bg-red-50/80 border-red-200 text-red-700"
          }`}
        >
          {statusMessage}
        </div>
      )}

      <form className="space-y-6" onSubmit={handleSubmit}>
        {/* Honeypots (champs cachés pour les robots) */}
        <div className="hidden" aria-hidden="true">
          <label>
            Ne pas remplir ce champ (anti-spam) :
            <input
              type="text"
              name="company"
              value={form.company}
              onChange={handleChange}
              autoComplete="off"
            />
          </label>
          <label>
            Ne pas remplir ce champ non plus :
            <input
              type="text"
              name="website"
              value={form.website}
              onChange={handleChange}
              autoComplete="off"
            />
          </label>
        </div>

        {/* Nom + Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Nom complet" htmlFor="name" error={errors.name}>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              placeholder="Votre nom et prénom"
              value={form.name}
              onChange={handleChange}
              className={`w-full rounded-2xl border px-3.5 py-3 text-sm outline-none bg-slate-50/70 transition
                ${
                  errors.name
                    ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-200"
                    : "border-slate-200/70 focus:border-[#1690FF] focus:ring-2 focus:ring-[#1690FF]/22"
                }`}
            />
          </Field>

          <Field label="Adresse e-mail" htmlFor="email" error={errors.email}>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="vous@example.com"
              value={form.email}
              onChange={handleChange}
              className={`w-full rounded-2xl border px-3.5 py-3 text-sm outline-none bg-slate-50/70 transition
                ${
                  errors.email
                    ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-200"
                    : "border-slate-200/70 focus:border-[#1690FF] focus:ring-2 focus:ring-[#1690FF]/22"
                }`}
            />
          </Field>
        </div>

        {/* Sujet */}
        <Field label="Sujet" htmlFor="subject" error={errors.subject}>
          <input
            id="subject"
            name="subject"
            type="text"
            required
            placeholder="Ex. : Demande de collaboration, devis, question…"
            value={form.subject}
            onChange={handleChange}
            className={`w-full rounded-2xl border px-3.5 py-3 text-sm outline-none bg-slate-50/70 transition
              ${
                errors.subject
                  ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-200"
                  : "border-slate-200/70 focus:border-[#1690FF] focus:ring-2 focus:ring-[#1690FF]/22"
              }`}
          />
        </Field>

        {/* Type de demande */}
        <Field label="Type de demande" htmlFor="type" error={errors.type}>
          <select
            id="type"
            name="type"
            value={form.type}
            onChange={handleChange}
            className={`w-full rounded-2xl border px-3.5 py-3 text-sm outline-none bg-slate-50/70 transition
              ${
                errors.type
                  ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-200"
                  : "border-slate-200/70 focus:border-[#1690FF] focus:ring-2 focus:ring-[#1690FF]/22"
              }`}
          >
            <option value="" disabled>
              Sélectionnez une option
            </option>
            <option value="question">Question générale</option>
            <option value="project">Projet / accompagnement</option>
            <option value="support">Support / problème technique</option>
            <option value="other">Autre</option>
          </select>
        </Field>

        {/* Message */}
        <Field label="Message" htmlFor="message" error={errors.message}>
          <textarea
            id="message"
            name="message"
            required
            rows={6}
            placeholder="Expliquez-nous en quelques lignes comment nous pouvons vous aider."
            value={form.message}
            onChange={handleChange}
            className={`w-full rounded-2xl border px-3.5 py-3 text-sm outline-none bg-slate-50/70 transition resize-none
              ${
                errors.message
                  ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-200"
                  : "border-slate-200/70 focus:border-[#1690FF] focus:ring-2 focus:ring-[#1690FF]/22"
              }`}
          />
        </Field>

        {/* Test anti-robot "intéressant" */}
        <Field
          label="Test anti-robot"
          htmlFor="humanAnswer"
          error={errors.humanAnswer}
        >
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3.5 py-3 space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Petite vérification de sécurité
            </p>

            {challenge.type === "math" && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs sm:text-sm text-slate-600">
                  {challenge.question}
                </span>
                <input
                  id="humanAnswer"
                  name="humanAnswer"
                  type="number"
                  inputMode="numeric"
                  value={form.humanAnswer}
                  onChange={handleChange}
                  className={`w-24 rounded-2xl border px-3 py-2 text-sm outline-none bg-white transition
                    ${
                      errors.humanAnswer
                        ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-200"
                        : "border-slate-200 focus:border-[#1690FF] focus:ring-2 focus:ring-[#1690FF]/22"
                    }`}
                />
              </div>
            )}

            {challenge.type === "logicDay" && (
              <div className="space-y-2">
                <p className="text-xs sm:text-sm text-slate-600">
                  {challenge.question}
                </p>
                <input
                  id="humanAnswer"
                  name="humanAnswer"
                  type="text"
                  placeholder="Ex. : jeudi"
                  value={form.humanAnswer}
                  onChange={handleChange}
                  className={`w-full rounded-2xl border px-3 py-2 text-sm outline-none bg-white transition
                    ${
                      errors.humanAnswer
                        ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-200"
                        : "border-slate-200 focus:border-[#1690FF] focus:ring-2 focus:ring-[#1690FF]/22"
                    }`}
                />
              </div>
            )}

            {challenge.type === "sequence" && (
              <div className="space-y-2">
                <p className="text-xs sm:text-sm text-slate-600">
                  {challenge.question}
                </p>
                <input
                  id="humanAnswer"
                  name="humanAnswer"
                  type="number"
                  inputMode="numeric"
                  placeholder="Réponse"
                  value={form.humanAnswer}
                  onChange={handleChange}
                  className={`w-full rounded-2xl border px-3 py-2 text-sm outline-none bg-white transition
                    ${
                      errors.humanAnswer
                        ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-200"
                        : "border-slate-200 focus:border-[#1690FF] focus:ring-2 focus:ring-[#1690FF]/22"
                    }`}
                />
              </div>
            )}

            {challenge.type === "word" && (
              <div className="space-y-2">
                <p className="text-xs sm:text-sm text-slate-600">
                  {challenge.question}
                </p>
                <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-slate-900/90 text-slate-50 text-xs font-mono">
                  {challenge.word}
                </div>
                <input
                  id="humanAnswer"
                  name="humanAnswer"
                  type="text"
                  placeholder="Tapez le mot ici"
                  value={form.humanAnswer}
                  onChange={handleChange}
                  className={`w-full rounded-2xl border px-3 py-2 text-sm outline-none bg-white transition
                    ${
                      errors.humanAnswer
                        ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-200"
                        : "border-slate-200 focus:border-[#1690FF] focus:ring-2 focus:ring-[#1690FF]/22"
                    }`}
                />
              </div>
            )}
          </div>
        </Field>

        {/* Consentement */}
        <div className="space-y-1">
          <div className="flex items-start gap-3 text-xs sm:text-sm text-slate-500">
            <input
              id="consent"
              name="consent"
              type="checkbox"
              required
              checked={form.consent}
              onChange={handleChange}
              className={`mt-1 h-4 w-4 rounded border ${
                errors.consent ? "border-red-400" : "border-slate-300"
              } text-[#1690FF] focus:ring-[#1690FF]`}
            />
            <label htmlFor="consent" className="leading-snug">
              J’accepte que mes informations soient utilisées uniquement pour
              répondre à ma demande. Aucune donnée ne sera partagée à des tiers.
            </label>
          </div>
          {errors.consent && (
            <p className="text-[11px] text-red-500 mt-1">{errors.consent}</p>
          )}
        </div>

        {/* Bouton submit */}
        <div className="pt-3 flex items-center justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`
              inline-flex items-center gap-2 rounded-full 
              bg-[#1690FF] text-white text-sm font-medium 
              px-6 py-2.5 shadow-[0_10px_28px_rgba(22,144,255,0.35)]
              transition-all
              hover:bg-[#1378d6] hover:shadow-[0_14px_32px_rgba(22,144,255,0.45)]
              active:translate-y-[0.5px] active:shadow-[0_6px_18px_rgba(22,144,255,0.35)]
              ${isSubmitting ? "opacity-60 cursor-not-allowed" : ""}
            `}
          >
            {isSubmitting ? "Envoi en cours…" : "Envoyer le message"}
            <FiSend className="w-4 h-4" />
          </button>
        </div>
      </form>
    </section>
  );
}

function Field({ label, htmlFor, children, error }) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-xs font-medium uppercase tracking-wide text-slate-500"
      >
        {label}
      </label>
      {children}
      {error && (
        <p className="text-[11px] text-red-500 mt-0.5">{error}</p>
      )}
    </div>
  );
}
