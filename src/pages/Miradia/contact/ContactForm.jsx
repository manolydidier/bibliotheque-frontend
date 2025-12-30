// src/pages/UserManagementDashboard/Components/Accueil/ContactForm.jsx
import React, { useState, useEffect, useRef } from "react";
import { FiSend, FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import api from "../../../services/api";

/**
 * Génère un challenge anti-robot intelligent et varié
 */
function generateHumanChallenge() {
  const modes = ["math", "logicDay", "sequence", "word"];
  const mode = modes[Math.floor(Math.random() * modes.length)];

  if (mode === "math") {
    const a = Math.floor(Math.random() * 8) + 2;
    const b = Math.floor(Math.random() * 8) + 2;
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
      question: `Combien font ${a} ${op} ${b} ?`,
      expected: String(expected),
    };
  }

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
    const offset = Math.floor(Math.random() * 6) + 1;
    const baseDay = days[baseIndex];
    const resultDay = days[(baseIndex + offset) % days.length];

    return {
      type: "logicDay",
      question: `Si aujourd'hui est ${baseDay}, quel jour sera-t-il dans ${offset} jour(s) ? (en minuscules)`,
      expected: resultDay,
    };
  }

  if (mode === "sequence") {
    const start = Math.floor(Math.random() * 5) + 1;
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
 * Calcule un score de suspicion basé sur le comportement utilisateur
 */
function computeSuspicionScore(elapsedMs, behavior) {
  let score = 0;

  if (elapsedMs < 5000) score += 30;
  if (behavior.mouseMoves === 0) score += 25;
  if (behavior.keyPresses === 0) score += 20;
  if (behavior.focusEvents < 2) score += 15;
  if (behavior.interactions < 3) score += 10;

  return Math.min(score, 100);
}

/**
 * Formulaire de contact sécurisé pour la plateforme MIRADIA
 */
export default function ContactForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    type: "PLATEFORM MIRADIA",
    message: "",
    consent: false,
    company: "", // Honeypot
    website: "", // Honeypot
    humanAnswer: "",
  });

  const [challenge] = useState(() => generateHumanChallenge());
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [startTime] = useState(() => Date.now());

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
    setErrors((prev) => ({
      ...prev,
      [name]: undefined,
    }));
  };

  const validate = () => {
    const newErrors = {};

    if (!form.name.trim()) newErrors.name = "Le nom complet est requis.";
    else if (form.name.trim().length < 3)
      newErrors.name = "Le nom doit contenir au moins 3 caractères.";

    if (!form.email.trim()) newErrors.email = "L'adresse e-mail est requise.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      newErrors.email = "Adresse e-mail invalide.";

    if (!form.subject.trim()) newErrors.subject = "Le sujet est requis.";
    else if (form.subject.trim().length < 5)
      newErrors.subject = "Le sujet doit contenir au moins 5 caractères.";

    if (!form.message.trim()) newErrors.message = "Le message est requis.";
    else if (form.message.trim().length < 20)
      newErrors.message = "Merci de détailler votre demande (au moins 20 caractères).";

    if (!form.consent)
      newErrors.consent = "Vous devez accepter le traitement de vos données.";

    // Challenge anti-bot
    const rawAnswer = form.humanAnswer.trim();
    if (!rawAnswer) {
      newErrors.humanAnswer = "Merci de répondre au test de sécurité.";
    } else {
      const normalizedAnswer = rawAnswer.toLowerCase();
      const expected = String(challenge.expected).toLowerCase();
      if (normalizedAnswer !== expected) {
        newErrors.humanAnswer = "Réponse incorrecte. Merci de réessayer.";
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
      const firstErrorField = Object.keys(validationErrors)[0];
      document.getElementById(firstErrorField)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }

    const elapsed = Date.now() - startTime;
    const suspicionScore = computeSuspicionScore(elapsed, behaviorRef.current);

    if (suspicionScore > 50) {
      setStatus("error");
      setStatusMessage(
        "Activité suspecte détectée. Merci de remplir le formulaire normalement."
      );
      return;
    }

    // Honeypots
    if (form.company?.trim() || form.website?.trim()) {
      console.warn("Honeypot détecté - soumission ignorée");
      setStatus("success");
      setStatusMessage("Votre message a été envoyé avec succès.");
      return;
    }

    setStatus("submitting");

    try {
      const { humanAnswer, company, website, ...payload } = form;
      await api.post("/public/contact", payload);

      setStatus("success");
      setStatusMessage(
        "Merci pour votre message ! Notre équipe vous répondra dans les plus brefs délais."
      );

      setForm({
        name: "",
        email: "",
        subject: "",
        type: "PLATEFORM MIRADIA",
        message: "",
        consent: false,
        company: "",
        website: "",
        humanAnswer: "",
      });
      setErrors({});

      behaviorRef.current = {
        mouseMoves: 0,
        keyPresses: 0,
        focusEvents: 0,
        interactions: 0,
      };
    } catch (err) {
      console.error("Erreur envoi formulaire :", err);
      setStatus("error");
      const errorMsg =
        err.response?.data?.message || "Une erreur est survenue. Merci de réessayer.";
      setStatusMessage(errorMsg);
    }
  };

  const isSubmitting = status === "submitting";

  useEffect(() => {
    if (status === "success" && statusMessage) {
      const timer = setTimeout(() => {
        setStatus("idle");
        setStatusMessage("");
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [status, statusMessage]);

  // Tracking comportemental
  useEffect(() => {
    const handleMouseMove = () => {
      behaviorRef.current.mouseMoves += 1;
      behaviorRef.current.interactions += 1;
    };
    const handleKeyDown = () => {
      behaviorRef.current.keyPresses += 1;
      behaviorRef.current.interactions += 1;
    };
    const handleFocusIn = () => {
      behaviorRef.current.focusEvents += 1;
      behaviorRef.current.interactions += 1;
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
    <section className="miradia-enter relative overflow-hidden rounded-3xl ring-1 ring-black/5 dark:ring-white/10">
      {/* Glass background */}
      <div className="absolute inset-0 bg-white/70 dark:bg-slate-950/35 backdrop-blur-2xl" />
      {/* Soft glow accents */}
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div
          className="absolute -top-24 -left-24 h-[300px] w-[300px] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle at 35% 35%, rgba(58,166,220,0.30), transparent 62%)",
          }}
        />
        <div
          className="absolute -bottom-28 right-0 h-[320px] w-[320px] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle at 35% 35%, rgba(76,192,81,0.22), transparent 62%)",
          }}
        />
      </div>

      <div className="relative p-6 sm:p-8 lg:p-10">
        {/* En-tête */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 dark:bg-white/10 border border-black/5 dark:border-white/10 backdrop-blur-sm mb-4">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-700 dark:text-slate-200">
              Plateforme MIRADIA
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 mb-2 tracking-tight">
            Contactez-nous
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300">
            Une question sur la plateforme MIRADIA ? Notre équipe est là pour vous aider.
          </p>

          <div
            className="mt-5 h-1.5 w-28 rounded-full"
            style={{ background: "linear-gradient(90deg, #3AA6DC, #4CC051, #FCCA00)" }}
          />
        </div>

        {/* Message de statut */}
        {status !== "idle" && statusMessage && (
          <div
            className={`mb-6 rounded-2xl px-4 py-3.5 text-sm border flex items-start gap-3 ${
              status === "success"
                ? "bg-emerald-50/90 border-emerald-200 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-400/25 dark:text-emerald-200"
                : "bg-red-50/90 border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-400/25 dark:text-red-200"
            }`}
          >
            {status === "success" ? (
              <FiCheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            ) : (
              <FiAlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            )}
            <span>{statusMessage}</span>
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Honeypots cachés */}
          <div className="hidden" aria-hidden="true">
            <label>
              Company:
              <input
                type="text"
                name="company"
                value={form.company}
                onChange={handleChange}
                autoComplete="off"
                tabIndex={-1}
              />
            </label>
            <label>
              Website:
              <input
                type="text"
                name="website"
                value={form.website}
                onChange={handleChange}
                autoComplete="off"
                tabIndex={-1}
              />
            </label>
          </div>

          {/* Nom + Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Nom complet" htmlFor="name" error={errors.name} required>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                placeholder="Jean Dupont"
                value={form.name}
                onChange={handleChange}
                className={inputClassName(errors.name)}
              />
            </Field>

            <Field label="Adresse e-mail" htmlFor="email" error={errors.email} required>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="jean.dupont@example.com"
                value={form.email}
                onChange={handleChange}
                className={inputClassName(errors.email)}
              />
            </Field>
          </div>

          {/* Sujet */}
          <Field label="Sujet" htmlFor="subject" error={errors.subject} required>
            <input
              id="subject"
              name="subject"
              type="text"
              required
              placeholder="Ex : Question sur les fonctionnalités, demande de démo..."
              value={form.subject}
              onChange={handleChange}
              className={inputClassName(errors.subject)}
            />
          </Field>

          {/* Type caché */}
          <input type="hidden" name="type" value={form.type} />

          {/* Message */}
          <Field label="Message" htmlFor="message" error={errors.message} required>
            <textarea
              id="message"
              name="message"
              required
              rows={6}
              placeholder="Décrivez votre demande en détail. Plus vous serez précis, mieux nous pourrons vous aider."
              value={form.message}
              onChange={handleChange}
              className={`${inputClassName(errors.message)} resize-none`}
              maxLength={500}
            />
            <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              {form.message.length}/500 caractères
            </div>
          </Field>

          {/* Test anti-robot */}
          <Field
            label="Vérification de sécurité"
            htmlFor="humanAnswer"
            error={errors.humanAnswer}
            required
          >
            <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-gradient-to-br from-slate-50/90 to-slate-100/50 dark:from-slate-900/40 dark:to-slate-950/25 px-4 py-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Prouvez que vous êtes humain
                </p>
              </div>

              <p className="text-sm text-slate-800 dark:text-slate-100 font-medium">
                {challenge.question}
              </p>

              {(challenge.type === "math" || challenge.type === "sequence") && (
                <input
                  id="humanAnswer"
                  name="humanAnswer"
                  type="number"
                  inputMode="numeric"
                  placeholder="Votre réponse"
                  value={form.humanAnswer}
                  onChange={handleChange}
                  className={inputClassName(errors.humanAnswer, "bg-white dark:bg-slate-900/50")}
                />
              )}

              {challenge.type === "logicDay" && (
                <input
                  id="humanAnswer"
                  name="humanAnswer"
                  type="text"
                  placeholder="Ex : mardi"
                  value={form.humanAnswer}
                  onChange={handleChange}
                  className={inputClassName(errors.humanAnswer, "bg-white dark:bg-slate-900/50")}
                />
              )}

              {challenge.type === "word" && (
                <div className="space-y-3">
                  <div className="inline-flex items-center px-4 py-2 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 text-white text-sm font-mono shadow-lg border border-white/10">
                    {challenge.word}
                  </div>
                  <input
                    id="humanAnswer"
                    name="humanAnswer"
                    type="text"
                    placeholder="Tapez le mot ici"
                    value={form.humanAnswer}
                    onChange={handleChange}
                    className={inputClassName(errors.humanAnswer, "bg-white dark:bg-slate-900/50")}
                  />
                </div>
              )}
            </div>
          </Field>

          {/* Consentement */}
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <input
                id="consent"
                name="consent"
                type="checkbox"
                required
                checked={form.consent}
                onChange={handleChange}
                className={`mt-1 h-4 w-4 rounded border ${
                  errors.consent ? "border-red-400" : "border-slate-300 dark:border-white/20"
                } text-[#1690FF] focus:ring-[#1690FF] focus:ring-offset-0 transition cursor-pointer bg-white dark:bg-slate-900/40`}
              />
              <label
                htmlFor="consent"
                className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed cursor-pointer"
              >
                J&apos;accepte que mes informations soient collectées et utilisées uniquement
                pour répondre à ma demande concernant la plateforme MIRADIA.
                Ces données ne seront jamais partagées avec des tiers.
              </label>
            </div>
            {errors.consent && (
              <p className="text-xs text-red-600 dark:text-red-300 ml-7">
                {errors.consent}
              </p>
            )}
          </div>

          {/* Bouton submit */}
          <div className="pt-4 flex items-center justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              * Champs obligatoires
            </p>
            <button
              type="submit"
              disabled={isSubmitting}
              className="
                inline-flex items-center gap-2.5 rounded-full
                text-white text-sm font-semibold
                px-7 py-3
                transition-all duration-200
                hover:scale-[1.02] active:scale-[0.98]
                disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100
                shadow-[0_12px_32px_rgba(22,144,255,0.35)]
                hover:shadow-[0_16px_40px_rgba(22,144,255,0.45)]
              "
              style={{ background: "linear-gradient(90deg, #1690FF, #0e7ce6)" }}
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  Envoyer le message
                  <FiSend className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function Field({ label, htmlFor, children, error, required }) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={htmlFor}
        className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs text-red-600 dark:text-red-300 flex items-center gap-1.5">
          <FiAlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}

function inputClassName(error, additionalClasses = "") {
  return `w-full rounded-2xl border px-4 py-3 text-sm outline-none
    bg-slate-50/70 text-slate-900 placeholder:text-slate-400
    dark:bg-slate-900/45 dark:text-slate-50 dark:placeholder:text-slate-400
    transition-all duration-200 ${additionalClasses}
    ${
      error
        ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-200 dark:border-red-400/60 dark:focus:ring-red-400/25"
        : "border-slate-200/70 focus:border-[#1690FF] focus:ring-2 focus:ring-[#1690FF]/20 dark:border-white/10 dark:focus:ring-[#1690FF]/25"
    }
  `;
}
