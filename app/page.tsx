"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Camera,
  LayoutDashboard,
  BookOpen,
  Dumbbell,
  User as UserIcon,
  Bell,
  Settings,
  Star,
  Scale,
  Edit2,
  TrendingDown,
  Target,
  Ban,
  Pill,
  ChevronRight,
  BellRing,
  Lock,
  LogOut,
  Leaf,
  Zap,
  Clock,
  Flame,
  Sparkles,
  Timer,
  TrendingUp,
  Play,
  X,
  Upload,
  CheckCircle2,
  Utensils,
  Activity,
  Droplet,
  Lightbulb,
  ArrowRight,
  Info,
  ChevronLeft
} from "lucide-react";

import { doc, getDoc, setDoc, updateDoc, collection, onSnapshot, writeBatch } from "firebase/firestore";
import { signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";

// Types corresponding to PRD
interface UserProfile {
  name: string;
  age: number;
  weight: number;
  height: number;
  goal: string;
  level: string;
  location: string;
  allergies: string[];
  medications: string[];
  isPremium: boolean;
}

interface MealLog {
  id: string;
  time: string;
  type: string;
  title: string;
  description: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  coachFeedback: string;
  image: string;
  isSimulated?: boolean;
}

interface Exercise {
  name: string;
  type: string;
  reps: string;
  duration: number; // in mins
  intensity: string; // "Baixa" | "Média" | "Alta"
  image: string;
  isAdapted?: boolean;
}

export default function AppletPage() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Navigation: 'onboarding' | 'dashboard' | 'diary' | 'workouts' | 'profile'
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const savedProfile = localStorage.getItem("coaching_profile");
      if (savedProfile) {
        return "dashboard";
      }
    }
    return "onboarding";
  });
  const [showNotification, setShowNotification] = useState<boolean>(false);
  const [notificationMsg, setNotificationMsg] = useState<string>("");

  // User profile state
  const [profile, setProfile] = useState<UserProfile>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("coaching_profile");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return {
      name: "Ana Silva",
      age: 29,
      weight: 64.5,
      height: 1.68,
      goal: "Manutenção de Peso",
      level: "Intermédio",
      location: "Lisboa, Portugal",
      allergies: ["Sem Lactose", "Vegana", "Sem Glúten"],
      medications: ["Suplemento Vitamínico B12"],
      isPremium: true
    };
  });

  // Food log state
  const [meals, setMeals] = useState<MealLog[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("coaching_meals");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return [
      {
        id: "meals-1",
        time: "08:30",
        type: "Pequeno-Almoço",
        title: "Bowl de Iogurte e Frutos Vermelhos",
        description: "Iogurte grego natural, mirtilos frescos, sementes de chia e uma colher de granola artesanal.",
        kcal: 320,
        protein: 18,
        carbs: 42,
        fat: 6,
        coachFeedback: "Excelente início de dia. Bom equilíbrio de fibras e probióticos que ajudam na sua digestão.",
        image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&q=80&w=600"
      },
      {
        id: "meals-2",
        time: "13:15",
        type: "Almoço",
        title: "Salmão Grelhado com Quinoa",
        description: "Posta de salmão, 100g de quinoa real, brócolos ao vapor e regado com azeite extra virgem.",
        kcal: 540,
        protein: 34,
        carbs: 28,
        fat: 18,
        coachFeedback: "Rico em Ômega-3. Ótima escolha para manter o foco cognitivo durante a tarde.",
        image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&q=80&w=600"
      }
    ];
  });

  // Exercise database
  const standardExercises: Exercise[] = [
    {
      name: "Agachamento com Peso",
      type: "Força",
      reps: "4 séries x 12 repetições",
      duration: 12,
      intensity: "Média",
      image: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&q=80&w=400"
    },
    {
      name: "Prancha Abdominal",
      type: "Core",
      reps: "3 séries de 60 segundos",
      duration: 8,
      intensity: "Baixa",
      image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&q=80&w=400"
    },
    {
      name: "Corrida Estacionária",
      type: "Cardio",
      reps: "Finalização rítmica",
      duration: 10,
      intensity: "Média",
      image: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&q=80&w=400"
    }
  ];

  const bonusCardioExercise: Exercise = {
    name: "Burpees Explosivos",
    type: "HIIT",
    reps: "3 séries x 15 repetições",
    duration: 15,
    intensity: "Alta",
    image: "https://images.unsplash.com/photo-1538805060514-97d9cc17730c?auto=format&fit=crop&q=80&w=400",
    isAdapted: true
  };

  // Water intake log
  const [waterIntake, setWaterIntake] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("coaching_water");
      if (saved) {
        const parsed = parseInt(saved);
        if (!isNaN(parsed)) return parsed;
      }
    }
    return 1000;
  });

  // Upload meal modal states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [uploadStep, setUploadStep] = useState<number>(1); // 1: input/upload, 2: processing, 3: result
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedText, setUploadedText] = useState<string>("");
  const [selectedMealType, setSelectedMealType] = useState<string>("Almoço");
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Gemini result state for tweaking
  const [geminiResult, setGeminiResult] = useState<{
    alimentos_identificados: string[];
    nutricao: {
      kcal: number;
      proteina_g: number;
      hidratos_g: number;
      lipidos_g: number;
    };
    feedback_qualitativo: string;
    ajuste_treino: {
      sugestao: string;
      detalhe: string;
    };
    simulated?: boolean;
  } | null>(null);

  // Profile fields for Editing modal
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [profileName, setProfileName] = useState<string>("");
  const [profileAge, setProfileAge] = useState<number>(29);
  const [profileWeight, setProfileWeight] = useState<number>(64.5);
  const [profileHeight, setProfileHeight] = useState<number>(1.68);
  const [profileGoal, setProfileGoal] = useState<string>("");
  const [profileLevel, setProfileLevel] = useState<string>("");
  const [profileAllergiesStr, setProfileAllergiesStr] = useState<string>("");
  const [profileMedsStr, setProfileMedsStr] = useState<string>("");

  // Save profile & water to Firestore
  const saveStateToFirestore = async (newProfile: UserProfile, newWater: number) => {
    if (auth.currentUser) {
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      try {
        await setDoc(userDocRef, {
          ...newProfile,
          waterIntake: newWater
        }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, "users/" + auth.currentUser.uid);
      }
    }
  };

  // Toast notifier helper
  const triggerToast = (msg: string) => {
    setNotificationMsg(msg);
    setShowNotification(true);
    setTimeout(() => {
      setShowNotification(false);
    }, 4500);
  };

  // Sync state with Firestore/Auth
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      
      if (currentUser) {
        triggerToast(`Sessão iniciada como ${currentUser.displayName || currentUser.email}`);
        
        // 1. Fetch user profile from Firestore or write default
        const userDocRef = doc(db, "users", currentUser.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            const loadedProfile: UserProfile = {
              name: data.name || currentUser.displayName || "Utilizador Coach",
              age: Number(data.age) || 30,
              weight: Number(data.weight) || 70,
              height: Number(data.height) || 1.75,
              goal: data.goal || "Manutenção de Peso",
              level: data.level || "Intermédio",
              location: data.location || "Portugal",
              allergies: data.allergies || [],
              medications: data.medications || [],
              isPremium: data.isPremium !== undefined ? data.isPremium : true
            };
            setProfile(loadedProfile);
            setWaterIntake(Number(data.waterIntake) || 1000);
            setActiveTab("dashboard");
          } else {
            // New user in DB - propagate local or default profile state
            const currentProfileWithGoogleName = {
              ...profile,
              name: currentUser.displayName || profile.name || "Novo Utilizador"
            };
            setProfile(currentProfileWithGoogleName);
            try {
              await setDoc(userDocRef, {
                ...currentProfileWithGoogleName,
                waterIntake: waterIntake
              });
            } catch (err) {
              handleFirestoreError(err, OperationType.CREATE, "users/" + currentUser.uid);
            }
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, "users/" + currentUser.uid);
        }

        // 2. Real-time subscribe to Meals subcollection
        const mealsColRef = collection(db, "users", currentUser.uid, "meals");
        const unsubscribeMeals = onSnapshot(mealsColRef, (snapshot) => {
          const loadedMeals: MealLog[] = [];
          snapshot.forEach((doc) => {
            loadedMeals.push(doc.data() as MealLog);
          });
          if (loadedMeals.length > 0) {
            // Sort by time or ID
            loadedMeals.sort((a, b) => a.time.localeCompare(b.time));
            setMeals(loadedMeals);
          } else {
            setMeals([]);
          }
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, "users/" + currentUser.uid + "/meals");
        });

        return () => {
          unsubscribeMeals();
        };
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Save to local storage when state changes
  const saveState = (newProfile: UserProfile, newMeals: MealLog[], newWater: number) => {
    localStorage.setItem("coaching_profile", JSON.stringify(newProfile));
    localStorage.setItem("coaching_meals", JSON.stringify(newMeals));
    localStorage.setItem("coaching_water", newWater.toString());
    
    saveStateToFirestore(newProfile, newWater);
  };

  // Quick preset data loader
  const handleLoadPresetAna = () => {
    const defaultProfile = {
      name: "Ana Silva",
      age: 29,
      weight: 64.5,
      height: 1.68,
      goal: "Manutenção de Peso",
      level: "Intermédio",
      location: "Lisboa, Portugal",
      allergies: ["Sem Lactose", "Vegana", "Sem Glúten"],
      medications: ["Suplemento Vitamínico B12"],
      isPremium: true
    };
    const defaultMeals = [
      {
        id: "meals-1",
        time: "08:30",
        type: "Pequeno-Almoço",
        title: "Bowl de Iogurte e Frutos Vermelhos",
        description: "Iogurte grego de coco, mirtilos frescos, sementes de chia e uma colher de granola artesanal sem glúten.",
        kcal: 320,
        protein: 18,
        carbs: 42,
        fat: 6,
        coachFeedback: "Excelente início de dia. 'Bom equilíbrio de fibras' e probióticos que ajudam na sua digestão e evitam desconfortos.",
        image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&q=80&w=600"
      },
      {
        id: "meals-2",
        time: "13:15",
        type: "Almoço",
        title: "Salmão Grelhado com Quinoa",
        description: "Posta de salmão, 100g de quinoa real, brócolos ao vapor e regado com azeite extra virgem.",
        kcal: 540,
        protein: 34,
        carbs: 28,
        fat: 18,
        coachFeedback: "Rico em Ômega-3. Ótima escolha para manter o foco cognitivo durante a tarde.",
        image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&q=80&w=600"
      }
    ];
    setProfile(defaultProfile);
    setMeals(defaultMeals);
    setWaterIntake(1500);
    
    if (auth.currentUser) {
      // Save profile and water to Firestore
      saveStateToFirestore(defaultProfile, 1500);
      // Populate cloud database with standard preset meals for onboarding convenience
      const batchList = defaultMeals.map(meal => {
        const mealDocRef = doc(db, "users", auth.currentUser!.uid, "meals", meal.id);
        return setDoc(mealDocRef, meal);
      });
      Promise.all(batchList).catch(err => console.error("Error setting initial list:", err));
    } else {
      saveState(defaultProfile, defaultMeals, 1500);
    }
    setActiveTab("dashboard");
    triggerToast("Carregado o perfil premium da Ana Silva com sucesso!");
  };

  // Custom onboarding submittal
  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newProfile = {
      ...profile,
      name: profileName || "Utilizador Coach",
      age: profileAge || 30,
      weight: profileWeight || 70,
      height: profileHeight || 1.75,
      goal: profileGoal || "Manutenção de Peso",
      level: profileLevel || "Intermédio",
      location: profile.location || "Portugal",
      allergies: profileAllergiesStr ? profileAllergiesStr.split(",").map(s => s.trim()) : [],
      medications: profileMedsStr ? profileMedsStr.split(",").map(s => s.trim()) : [],
      isPremium: true
    };
    setProfile(newProfile);
    if (auth.currentUser) {
      await saveStateToFirestore(newProfile, waterIntake);
    } else {
      saveState(newProfile, meals, waterIntake);
    }
    setActiveTab("dashboard");
    triggerToast(`Conta configurada! Bem-vindo(a), ${newProfile.name}!`);
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      await signInWithPopup(auth, provider);
    } catch (e: any) {
      triggerToast("Erro ao iniciar sessão com o Google.");
      console.error(e);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await signOut(auth);
      // Clear local states
      setMeals([]);
      setWaterIntake(0);
      setProfile({
        name: "Novo Utilizador",
        age: 30,
        weight: 70,
        height: 1.75,
        goal: "Manutenção de Peso",
        level: "Intermédio",
        location: "Portugal",
        allergies: [],
        medications: [],
        isPremium: true
      });
      localStorage.clear();
      setActiveTab("onboarding");
      triggerToast("Sessão terminada com sucesso!");
    } catch (e) {
      console.error("Logout error: ", e);
    }
  };

  // Edit profile actions
  const openEditProfileModal = () => {
    setProfileName(profile.name);
    setProfileAge(profile.age);
    setProfileWeight(profile.weight);
    setProfileHeight(profile.height);
    setProfileGoal(profile.goal);
    setProfileLevel(profile.level);
    setProfileAllergiesStr(profile.allergies.join(", "));
    setProfileMedsStr(profile.medications.join(", "));
    setIsEditingProfile(true);
  };

  const handleSaveProfileEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const edited = {
      ...profile,
      name: profileName,
      age: profileAge,
      weight: profileWeight,
      height: profileHeight,
      goal: profileGoal,
      level: profileLevel,
      allergies: profileAllergiesStr ? profileAllergiesStr.split(",").map(s => s.trim()).filter(Boolean) : [],
      medications: profileMedsStr ? profileMedsStr.split(",").map(s => s.trim()).filter(Boolean) : [],
    };
    setProfile(edited);
    saveState(edited, meals, waterIntake);
    setIsEditingProfile(false);
    triggerToast("Perfil atualizado e guardado com sucesso!");
  };

  // Clear data / Logout demo
  const handleResetApp = () => {
    localStorage.clear();
    setMeals([]);
    setWaterIntake(0);
    setProfile({
      name: "Novo Utilizador",
      age: 30,
      weight: 70,
      height: 1.75,
      goal: "Manutenção de Peso",
      level: "Intermédio",
      location: "Portugal",
      allergies: [],
      medications: [],
      isPremium: false
    });
    setActiveTab("onboarding");
    triggerToast("Dados eliminados! Pode iniciar uma nova simulação.");
  };

  // Statistics calculation
  const totalKcal = meals.reduce((sum, item) => sum + item.kcal, 0);
  const totalProtein = meals.reduce((sum, item) => sum + item.protein, 0);
  const totalCarbs = meals.reduce((sum, item) => sum + item.carbs, 0);
  const totalFat = meals.reduce((sum, item) => sum + item.fat, 0);

  // Dynamic Calorie Targets based on Goals
  let kcalTarget = 2100;
  let proteinTarget = 110;
  let carbsTarget = 220;
  let fatTarget = 65;

  if (profile.goal.includes("Perda") || profile.goal.toLowerCase().includes("gordura") || profile.goal.toLowerCase().includes("emagrecer")) {
    kcalTarget = 1600;
    proteinTarget = 120;
    carbsTarget = 150;
    fatTarget = 50;
  } else if (profile.goal.includes("Ganho") || profile.goal.toLowerCase().includes("massa") || profile.goal.toLowerCase().includes("hipertrofia")) {
    kcalTarget = 2600;
    proteinTarget = 140;
    carbsTarget = 310;
    fatTarget = 80;
  }

  const kcalPct = Math.min(Math.round((totalKcal / kcalTarget) * 100), 150);

  // Dynamic Workout adaptations
  // Trigger "+15 min Cardio" or high intensity if intake is heavier than standard or exceed goal
  const hasExceededKcal = totalKcal > 1100 || (kcalPct > 85 && profile.goal.includes("Perda"));
  
  // Custom list of today's workouts
  const activeWorkoutExercises = [...standardExercises];
  if (hasExceededKcal) {
    // Add burpees in place 1 to match adapted layout
    activeWorkoutExercises.splice(1, 0, bonusCardioExercise);
  }

  // Calculated overall training stats
  const totalTrainingTime = activeWorkoutExercises.reduce((sum, item) => sum + item.duration, 0);
  const trainingIntensity = hasExceededKcal ? "Alta" : "Média";
  const trainingTargetBurn = hasExceededKcal ? 620 : 420;

  // Meal templates for quick mock upload visual demos
  const presetFoodTemplates = [
    {
      title: "Salada Grega Especial",
      description: "Tomate cereja, pepino fresco, cebola roxa, queijo Feta vegano, azeitonas, azeite extra virgem orgânico.",
      textInput: "Salada grega fresca com pepino, tomate, queijo feta vegano e azeite de oliva",
      image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=400",
      kcal: 285,
      protein: 12,
      carbs: 18,
      fat: 22,
      feedback_qualitativo: "Excelente densidade de micronutrientes. O azeite fornece gorduras saudáveis cruciais para a absorção de vitaminas lipossolúveis. Alinhado com as tuas restrições veganas e sem glúten.",
      sugestao: "Treino Padrão",
      detalhe: "Por ser uma opção de baixa caloria e alta hidratação, não requer ajustes adicionais de cardio compensatório hoje."
    },
    {
      title: "Salmão Grelhado com Quinoa",
      description: "Posta de salmão silvestre grelhada, quinoa cozida e brócolos refogados com pouca gordura.",
      textInput: "Salmão grelhado, quinoa cozida e brócolos ao vapor",
      image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&q=80&w=400",
      kcal: 540,
      PeixeNotVegano: true,
      protein: 34,
      carbs: 28,
      fat: 18,
      feedback_qualitativo: "Prato extremamente balanceado! Altamente rico em Ômega-3 e proteínas limpas. Atenção: embora saudável e sem glúten/lactose, o salmão viola estritamente a tua restrição vegana.",
      sugestao: "Treino de Força Focado",
      detalhe: "A ingestão calórica está perfeitamente controlada. Com o aporte ideal de proteína, os teus músculos agradecem!"
    },
    {
      title: "Hambúrguer Triplo com Batatas",
      description: "Hambúrguer gourmet com pão francês de trigo, queijo cheddar comum derretido, cebola frita e grande porção de batatas fritas.",
      textInput: "Hambúrguer Gourmet completo no pão brioche com queijo derretido e batatas fritas industriais",
      image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=400",
      kcal: 820,
      protein: 38,
      carbs: 75,
      fat: 32,
      feedback_qualitativo: "Ingestão calórica excessiva (+450 kcal acima do almoço regular). Além disso, contém Glúten e Lactose e queijo animal, violando rigorosamente TODAS as tuas 3 restrições principais (Vegana, Sem Lactose, Sem Glúten).",
      sugestao: "Adicionar +15 min HIIT Cardio",
      detalhe: "Para compensar este excedente substancial (+450 kcal), o teu motor inteligente adicionou automaticamente um exercício de HIIT de alta queima calórica ao plano de hoje."
    }
  ];

  // Drag and Drop handles
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
        const isVideo = file.type.startsWith("video/");
        const reader = new FileReader();
        reader.onload = () => {
          setUploadedImage(reader.result as string);
          triggerToast(isVideo ? "Vídeo carregado com sucesso." : "Imagem carregada com sucesso.");
        };
        reader.readAsDataURL(file);
      } else {
        triggerToast("Apenas formatos de imagem ou vídeo são suportados.");
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
        const isVideo = file.type.startsWith("video/");
        const reader = new FileReader();
        reader.onload = () => {
          setUploadedImage(reader.result as string);
          triggerToast(isVideo ? "Vídeo selecionado!" : "Imagem selecionada!");
        };
        reader.readAsDataURL(file);
      } else {
        triggerToast("Apenas formatos de imagem ou vídeo são suportados.");
      }
    }
  };

  // Run Real/Simulated Gemini food recognizer API
  const handleAnalyzeFood = async () => {
    setUploadStep(2); // Progress screen

    // Build the payload
    const payload = {
      image: uploadedImage,
      text: uploadedText,
      mealType: selectedMealType,
      profile: {
        age: profile.age,
        weight: profile.weight,
        height: profile.height,
        goal: profile.goal,
        allergies: profile.allergies,
        medications: profile.medications
      }
    };

    try {
      const response = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error("Erro na comunicação com a IA");
      }

      const result = await response.json();
      setGeminiResult(result);
      setUploadStep(3); // Result step
      triggerToast(result.simulated ? "Visualização inteligente simulada ativa" : "Análise da Gemini concluída!");
    } catch (error) {
      console.error(error);
      // Fallback in case of server failure
      const fallbackResult = {
        alimentos_identificados: ["Tomate", "Pepino", "Batata-doce assada", "Cebola roxa", "Ingredientes saudáveis"],
        nutricao: {
          kcal: 410,
          proteina_g: 14,
          hidratos_g: 58,
          lipidos_g: 10
        },
        feedback_qualitativo: "Muito bem! Alimento de densidade nutricional ótima sem lactose.",
        ajuste_treino: {
          sugestao: "Manter Plano Programado",
          detalhe: "O prato atende muito bem à sua cota de energia atual de forma equilibrada."
        }
      };
      setGeminiResult(fallbackResult);
      setUploadStep(3);
      triggerToast("Carregada análise padrão (Modo Offline)");
    }
  };

  // Preset quick load demo in upload modal
  const handleLoadFoodPreset = (presetIndex: number) => {
    const pr = presetFoodTemplates[presetIndex];
    setUploadedText(pr.textInput);
    setUploadedImage(pr.image);
    triggerToast(`Alimento demo carregado: "${pr.title}"`);
  };

  // Add analyzed meal to user database
  const handleAddMealToDiary = async () => {
    if (!geminiResult) return;

    const newMeal: MealLog = {
      id: "meals-" + Date.now(),
      time: new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }),
      type: selectedMealType,
      title: (uploadedText ? uploadedText.split(" ").slice(0, 4).join(" ") : geminiResult.alimentos_identificados.slice(0, 3).join(", ")) || "Refeição Personalizada",
      description: geminiResult.alimentos_identificados.join(", ") + ". " + (uploadedText || "Registado via IA Vision."),
      kcal: Number(geminiResult.nutricao.kcal) || 350,
      protein: Number(geminiResult.nutricao.proteina_g) || 15,
      carbs: Number(geminiResult.nutricao.hidratos_g) || 35,
      fat: Number(geminiResult.nutricao.lipidos_g) || 12,
      coachFeedback: geminiResult.feedback_qualitativo,
      image: uploadedImage || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=400"
    };

    if (auth.currentUser) {
      const mealDocRef = doc(db, "users", auth.currentUser.uid, "meals", newMeal.id);
      try {
        await setDoc(mealDocRef, newMeal);
        // Sync user profile state as well
        await saveStateToFirestore(profile, waterIntake);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${auth.currentUser.uid}/meals/${newMeal.id}`);
      }
    } else {
      // Offline fallback
      const updatedMeals = [...meals, newMeal];
      setMeals(updatedMeals);
      saveState(profile, updatedMeals, waterIntake);
    }
    
    // Reset modal variables
    setIsUploadModalOpen(false);
    setUploadStep(1);
    setUploadedImage(null);
    setUploadedText("");
    setGeminiResult(null);

    // Switch check or warning page context
    if (newMeal.kcal > 600) {
      triggerToast("Aviso: Esta refeição excedeu o limite! O treino foi intensificado com HIIT.");
      setActiveTab("workouts");
    } else {
      triggerToast("Refeição registada com sucesso no Diário Alimentar");
      setActiveTab("diary");
    }
  };

  // BMI (IMC) Calculation helper
  const bmiCalculator = () => {
    if (!profile.height || !profile.weight) return { value: "0", class: "Saudável" };
    const val = profile.weight / (profile.height * profile.height);
    const rounded = val.toFixed(1);
    
    let category = "Saudável";
    let colorClass = "bg-green-100 text-green-800";
    if (val < 18.5) {
      category = "Abaixo do Peso";
      colorClass = "bg-amber-100 text-amber-800";
    } else if (val >= 25 && val < 29.9) {
      category = "Sobrepeso";
      colorClass = "bg-amber-100 text-amber-800";
    } else if (val >= 30) {
      category = "Obesidade";
      colorClass = "bg-red-100 text-red-800";
    }
    
    return { value: rounded, category, colorClass };
  };

  const bmiData = bmiCalculator();

  if (!isMounted) {
    return null;
  }

  return (
    <div className="flex min-h-screen text-on-surface bg-background">
      
      {/* Toast Alert Notification Banner */}
      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 bg-primary text-on-primary font-body px-6 py-4 rounded-xl shadow-2xl z-50 flex items-center gap-3 border border-primary-container"
          >
            <Sparkles className="w-5 h-5 animate-pulse text-tertiary-fixed" />
            <span className="text-base font-semibold">{notificationMsg}</span>
            <button onClick={() => setShowNotification(false)} className="ml-2 hover:opacity-75">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Side Navigation Bar */}
      <aside className="w-64 bg-surface-container border-r border-outline-variant/30 h-screen fixed left-0 top-0 flex flex-col py-6 px-4 z-40">
        
        {/* Brand Logo Header Container */}
        <div className="mb-8 px-2 flex flex-col items-center">
          <div className="flex items-center justify-center w-full h-16 mb-2">
            <svg viewBox="0 0 100 100" className="h-12 w-12 text-primary" fill="currentColor">
              <path d="M50 15c-15 0-25 10-25 25s10 25 25 25 25-10 25-25-10-25-25-25zm0 40c-8.3 0-15-6.7-15-15s6.7-15 15-15 15 6.7 15 15-6.7 15-15 15z" />
              <path d="M48 60c-20 0-35 8-35 25h70c0-17-15-25-35-25z" />
            </svg>
          </div>
          <h1 className="font-headline text-xl font-bold text-center text-primary leading-tight">O Meu Coach</h1>
          <p className="text-xs text-on-surface-variant font-semibold tracking-wider uppercase font-body -mt-0.5">Inteligente</p>
        </div>

        {/* Action Button: Register Meal */}
        <button
          onClick={() => {
            setUploadStep(1);
            setUploadedImage(null);
            setUploadedText("");
            setGeminiResult(null);
            setIsUploadModalOpen(true);
          }}
          className="w-full bg-primary text-on-primary py-3.5 px-4 rounded-xl font-body font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all duration-150 shadow-md shadow-primary/10 mb-6"
        >
          <Camera className="w-5 h-5 text-tertiary-fixed mb-0.5" />
          <span>Registar Refeição</span>
        </button>

        {/* Tab Item Navigations */}
        <nav className="flex-1 space-y-1 bg-surface-container">
          <button
            onClick={() => {
              if (activeTab === "onboarding") {
                triggerToast("Complete a configuração de perfil para aceder!");
              } else {
                setActiveTab("dashboard");
              }
            }}
            className={`w-full flex items-center gap-3 py-3 px-4 rounded-lg transition-colors font-body text-base font-semibold ${
              activeTab === "dashboard"
                ? "text-primary bg-primary/10 border-r-4 border-primary"
                : "text-on-surface-variant hover:bg-surface-variant/50"
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => {
              if (activeTab === "onboarding") {
                triggerToast("Complete o seu perfil primeiro!");
              } else {
                setActiveTab("diary");
              }
            }}
            className={`w-full flex items-center gap-3 py-3 px-4 rounded-lg transition-colors font-body text-base font-semibold ${
              activeTab === "diary"
                ? "text-primary bg-primary/10 border-r-4 border-primary"
                : "text-on-surface-variant hover:bg-surface-variant/50"
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span>Diário Alimentar</span>
          </button>

          <button
            onClick={() => {
              if (activeTab === "onboarding") {
                triggerToast("Complete a configuração de perfil!");
              } else {
                setActiveTab("workouts");
              }
            }}
            className={`w-full flex items-center gap-3 py-3 px-4 rounded-lg transition-colors font-body text-base font-semibold ${
              activeTab === "workouts"
                ? "text-primary bg-primary/10 border-r-4 border-primary"
                : "text-on-surface-variant hover:bg-surface-variant/50"
            }`}
          >
            <Dumbbell className="w-5 h-5" />
            <span>Treinos</span>
          </button>

          <button
            onClick={() => {
              if (activeTab === "onboarding") {
                triggerToast("Inicie o perfil para configurar!");
              } else {
                setActiveTab("profile");
              }
            }}
            className={`w-full flex items-center gap-3 py-3 px-4 rounded-lg transition-colors font-body text-base font-semibold ${
              activeTab === "profile"
                ? "text-primary bg-primary/10 border-r-4 border-primary"
                : "text-on-surface-variant hover:bg-surface-variant/50"
            }`}
          >
            <UserIcon className="w-5 h-5" />
            <span>Perfil</span>
          </button>
        </nav>

        {/* Small footer settings */}
        <div className="mt-auto pt-4 border-t border-outline-variant/30 text-center">
          {activeTab !== "onboarding" && (
            <div className="flex items-center gap-3 px-2 mb-3 text-left">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-primary-container bg-surface-variant flex-shrink-0">
                <img
                  src={user?.photoURL || "https://lh3.googleusercontent.com/aida-public/AB6AXuCKzu4bVtb_3HP8V7sOUZ9LSK6HE21SLYmW8farRnZ0vXF0vpJMcdE3v5zn4CPAAR9oEevqR9d7KUUAu_xcJJUg7py2nhJEstdYz88ET6XOju8uVTqz8e8S6qYn6KrEdaVRN4HffZvOvOa99tu3X_p3tBQcF0JgnDa2j0Ql3nVLkZWzSIrPxA0KlcomKG2y6eO7Moeyz-298vUMbbP8smX6bdKuVqi_1eGyqz3tC2gctrYSCeDL2Hy6wgFHAUUkCwhryfvB-8XTtW-q"}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold truncate">{profile.name}</p>
                <span className="text-[9px] text-primary font-bold flex items-center gap-1">
                  {user ? (
                    <>
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Sincronizado c/ Google
                    </>
                  ) : (
                    "Membro Ativo"
                  )}
                </span>
              </div>
            </div>
          )}
          <p className="text-[10px] text-on-surface-variant/60 font-mono">
            V1.2 • AI Powered Coach
          </p>
        </div>
      </aside>

      {/* Main Container Content */}
      <div className="ml-64 flex-1 min-h-screen flex flex-col">
        
        {/* Top Header Navigation Panel */}
        <header className="h-16 px-8 sticky top-0 bg-surface/95 backdrop-blur-md border-b border-outline-variant/20 flex justify-between items-center z-30">
          <div>
            {activeTab === "onboarding" ? (
              <h2 className="font-headline text-lg font-bold text-primary">Onboarding & Registo</h2>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="font-headline text-xl font-bold text-on-surface">
                  {activeTab === "dashboard" && "Painel Principal"}
                  {activeTab === "diary" && "Diário Alimentar"}
                  {activeTab === "workouts" && "Treinos Dinâmicos"}
                  {activeTab === "profile" && "Perfil do Utilizador"}
                </h2>
                <span className="text-sm font-body text-on-surface-variant/60">
                  | Lisboa, PT
                </span>
                {meals.length > 2 && hasExceededKcal && (
                  <span className="text-xs font-bold md:inline-block hidden bg-amber-100 text-amber-800 px-3 py-0.5 rounded-full uppercase leading-relaxed ml-2 animate-pulse">
                    Ajuste Ativo de Cardio
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => triggerToast("Por agora não tem novas notificações de treinos.")}
              className="p-2 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
            >
              <Bell className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                if (activeTab !== "onboarding") {
                  setActiveTab("profile");
                  triggerTabScroll();
                }
              }}
              className="p-2 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
            >
              <Settings className="w-5 h-5" />
            </button>
            <div className="w-9 h-9 rounded-full overflow-hidden border border-outline-variant bg-surface-variant">
              <img
                src={user?.photoURL || "https://lh3.googleusercontent.com/aida-public/AB6AXuCKzu4bVtb_3HP8V7sOUZ9LSK6HE21SLYmW8farRnZ0vXF0vpJMcdE3v5zn4CPAAR9oEevqR9d7KUUAu_xcJJUg7py2nhJEstdYz88ET6XOju8uVTqz8e8S6qYn6KrEdaVRN4HffZvOvOa99tu3X_p3tBQcF0JgnDa2j0Ql3nVLkZWzSIrPxA0KlcomKG2y6eO7Moeyz-298vUMbbP8smX6bdKuVqi_1eGyqz3tC2gctrYSCeDL2Hy6wgFHAUUkCwhryfvB-8XTtW-q"}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </header>

        {/* View Router based on Tabs */}
        <main className="p-8 max-w-6xl mx-auto w-full flex-1">
          
          {/* TAB 0: Onboarding View */}
          {activeTab === "onboarding" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-xl mx-auto bg-surface-container rounded-2xl p-8 border border-outline-variant/45 shadow-sm"
            >
              <div className="text-center mb-8">
                <Leaf className="w-12 h-12 text-primary mx-auto mb-3" />
                <h3 className="text-3xl font-headline font-bold text-primary">Onboarding & Perfil</h3>
                <p className="text-sm text-on-surface-variant mt-2 font-body">
                  Configure o seu perfil biométrico e de saúde para darmos início ao aconselhamento inteligente de nutrição e treinos focados.
                </p>

                {/* Google Authentication Section */}
                {!user ? (
                  <div className="mt-4 p-4 bg-primary/5 rounded-xl border border-primary/20 text-left">
                    <h4 className="text-xs font-bold text-primary text-center mb-1">☁️ Sincronização na Nuvem Activa</h4>
                    <p className="text-[11px] text-on-surface-variant text-center mb-3 leading-relaxed">
                      Ligue a sua conta Google para guardar automaticamente as refeições calculadas, imagens, vídeos de treino e hidratação.
                    </p>
                    <button
                      onClick={handleGoogleLogin}
                      type="button"
                      className="w-full bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 duration-100 cursor-pointer"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      Entrar com uma conta Gmail / Google
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/20 text-center flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-emerald-500 mb-1.5 shadow-sm">
                      <img src={user.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150"} alt="Avatar" className="w-full h-full object-cover" />
                    </div>
                    <h4 className="text-xs font-bold text-emerald-800 mb-0.5">Sessão Iniciada! Prone na Nuvem</h4>
                    <p className="text-[11px] text-on-surface-variant">Sincronizado via Google com <strong>{user.email}</strong></p>
                    <button
                      onClick={handleGoogleLogout}
                      type="button"
                      className="mt-2 text-rose-600 hover:text-rose-700 font-bold text-[10px] underline cursor-pointer"
                    >
                      Terminar Sessão
                    </button>
                  </div>
                )}

                <div className="mt-4 p-3 bg-primary/5 rounded-xl border border-primary/10 inline-block text-left">
                  <p className="text-xs text-primary font-bold text-center">💡 Dica de Integração Rápida</p>
                  <p className="text-xs text-on-surface-variant mt-1 text-center">
                    Também pode saltar esta fase e carregar o perfil premium completo da <span className="font-bold text-primary">Ana Silva</span> em segundos!
                  </p>
                  <button
                    onClick={handleLoadPresetAna}
                    className="w-full mt-2.5 bg-tertiary text-on-tertiary text-xs font-bold py-2 px-4 rounded-lg hover:opacity-95 transition-opacity"
                  >
                    Carregar Ana Silva Premium (Lisboa)
                  </button>
                </div>
              </div>

              <form onSubmit={handleOnboardingSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold mb-1.5 text-on-surface">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Ana Silva"
                    className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-1.5 text-on-surface">Idade (Anos)</label>
                    <input
                      type="number"
                      required
                      min="10"
                      max="120"
                      value={profileAge}
                      onChange={(e) => setProfileAge(Number(e.target.value))}
                      className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-2.5 text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1.5 text-on-surface">Peso (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      min="30"
                      max="250"
                      value={profileWeight}
                      onChange={(e) => setProfileWeight(Number(e.target.value))}
                      className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-2.5 text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1.5 text-on-surface">Altura (m)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="1.0"
                      max="2.5"
                      value={profileHeight}
                      onChange={(e) => setProfileHeight(Number(e.target.value))}
                      className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-2.5 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-1.5 text-on-surface">Objetivo Fitness Principal</label>
                  <select
                    value={profileGoal}
                    onChange={(e) => setProfileGoal(e.target.value)}
                    className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-2.5 text-sm"
                  >
                    <option value="Manutenção de Peso">Manutenção de Peso (Estabilizar ingestão)</option>
                    <option value="Perda de Gordura">Perda de Gordura (Défice calórico sugerido)</option>
                    <option value="Ganho de Massa">Ganho de Massa (Superavit calórico hipertrófico)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-1.5 text-on-surface">Restrições Alimentares (Separadas por vírgula)</label>
                  <input
                    type="text"
                    value={profileAllergiesStr}
                    onChange={(e) => setProfileAllergiesStr(e.target.value)}
                    placeholder="Sem Lactose, Vegana, Sem Glúten"
                    className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-2.5 text-sm"
                  />
                  <p className="text-[10px] text-on-surface-variant/70 mt-1">Ex: Sem Lactose, Vegana, Alergia a frutos secos...</p>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-1.5 text-on-surface">Medicação Ativa ou Suplementação</label>
                  <input
                    type="text"
                    value={profileMedsStr}
                    onChange={(e) => setProfileMedsStr(e.target.value)}
                    placeholder="Suplemento Vitamínico B12"
                    className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-2.5 text-sm"
                  />
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    className="w-full bg-primary text-on-primary font-bold py-3.5 px-4 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5 text-tertiary-fixed font-bold" />
                    <span>Gravar e Continuar</span>
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* TAB 1: Painel Principal / Dashboard View */}
          {activeTab === "dashboard" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              {/* Salutation Banner */}
              <div className="flex md:flex-row flex-col justify-between items-start md:items-center bg-primary/5 p-6 rounded-2xl border border-primary/10 gap-4">
                <div>
                  <h3 className="text-3xl font-headline font-bold text-on-surface">
                    Olá, {profile.name}! 👋
                  </h3>
                  <p className="text-base text-on-surface-variant font-body mt-1">
                    Bem-vindo(a) de volta. Ativação calórica diária em ordem. Hoje é dia de treinar!
                  </p>
                </div>
                <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl border border-outline-variant/30 font-body">
                  <Leaf className="w-5 h-5 text-primary animate-pulse" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/70">Membro Premium</p>
                    <p className="text-xs font-bold text-primary">Nível {profile.level}</p>
                  </div>
                </div>
              </div>

              {/* Bento Grid layout */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* 1. Daily Balance Main Progress Circle */}
                <section className="md:col-span-7 bg-surface-container rounded-2xl p-8 border border-outline-variant/10 shadow-custom flex flex-col items-center justify-center relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 transition-transform duration-500 group-hover:scale-110"></div>
                  
                  <div className="z-10 text-center mb-6">
                    <h3 className="text-xl font-headline font-bold text-on-surface">Equilíbrio Diário</h3>
                    <p className="text-sm text-on-surface-variant/90 font-body">
                      Consumido hoje: <span className="font-bold">{totalKcal}</span> de <span className="font-bold">{kcalTarget} kcal</span>
                    </p>
                  </div>

                  <div className="relative w-48 h-48 flex items-center justify-center">
                    {/* SVG progress loader circle */}
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="96"
                        cy="96"
                        r="80"
                        stroke="rgba(0,0,0,0.05)"
                        strokeWidth="10"
                        fill="transparent"
                      />
                      <circle
                        cx="96"
                        cy="96"
                        r="80"
                        stroke="var(--color-primary)"
                        strokeWidth="12"
                        fill="transparent"
                        strokeDasharray={502.4}
                        strokeDashoffset={502.4 - (502.4 * Math.min(kcalPct, 100)) / 100}
                        className="transition-all duration-1000 ease-in-out"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center font-body">
                      <span className="text-4xl font-extrabold text-primary">{kcalPct}%</span>
                      <span className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold mt-0.5">Consumidas</span>
                    </div>
                  </div>

                  <div className="mt-8 flex gap-8 text-center text-sm font-semibold w-full justify-around pt-4 border-t border-outline-variant/20">
                    <div>
                      <p className="text-xs text-on-surface-variant uppercase tracking-widest font-bold mb-1">Restantes</p>
                      <p className="text-base font-bold text-on-surface">
                        {Math.max(0, kcalTarget - totalKcal)} kcal
                      </p>
                    </div>
                    <div className="w-[1px] bg-outline-variant/30"></div>
                    <div>
                      <p className="text-xs text-on-surface-variant uppercase tracking-widest font-bold mb-1">Exercício Ativo</p>
                      <p className="text-base font-bold text-primary">+{trainingTargetBurn} kcal</p>
                    </div>
                  </div>
                </section>

                {/* Shortcuts & Quick Stats Side panel */}
                <div className="md:col-span-5 flex flex-col gap-6">
                  
                  {/* Action box */}
                  <button
                    onClick={() => {
                      setUploadStep(1);
                      setUploadedImage(null);
                      setUploadedText("");
                      setGeminiResult(null);
                      setIsUploadModalOpen(true);
                    }}
                    className="w-full bg-primary text-on-primary rounded-xl p-5 flex items-center justify-between hover:scale-[0.98] transition-transform duration-150 group shadow-lg shadow-primary/20"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="bg-white/20 p-2.5 rounded-lg">
                        <Camera className="w-6 h-6 text-tertiary-fixed" />
                      </div>
                      <div className="text-left font-body">
                        <p className="font-extrabold text-base leading-tight">Registar Refeição</p>
                        <p className="text-xs text-on-primary-container/85 mt-0.5">Análise rápida por fotografia</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                  </button>

                  {/* Macronutrient breakdown */}
                  <section className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/20 space-y-4">
                    <h3 className="text-base font-bold text-on-surface font-headline">Macronutrientes</h3>
                    <div className="space-y-3 font-body">
                      {/* Proteínas */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-on-surface-variant font-bold">Proteínas</span>
                          <span className="text-on-surface font-extrabold">{totalProtein}g / {proteinTarget}g</span>
                        </div>
                        <div className="w-full bg-surface-variant rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-1000"
                            style={{ width: `${Math.min((totalProtein / proteinTarget) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Hidratos */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-on-surface-variant font-bold">Hidratos de Carbono</span>
                          <span className="text-on-surface font-extrabold">{totalCarbs}g / {carbsTarget}g</span>
                        </div>
                        <div className="w-full bg-surface-variant rounded-full h-2">
                          <div
                            className="bg-tertiary h-2 rounded-full transition-all duration-1000"
                            style={{ width: `${Math.min((totalCarbs / carbsTarget) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Lípidos */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-on-surface-variant font-bold">Lípidos (Gorduras)</span>
                          <span className="text-on-surface font-extrabold">{totalFat}g / {fatTarget}g</span>
                        </div>
                        <div className="w-full bg-surface-variant rounded-full h-2">
                          <div
                            className="bg-secondary h-2 rounded-full transition-all duration-1000"
                            style={{ width: `${Math.min((totalFat / fatTarget) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </div>

              {/* Dynamic Workout section & tip */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
                
                {/* Workout Card of the Day */}
                <section className="md:col-span-8 relative rounded-2xl overflow-hidden min-h-[300px] flex items-end p-8 group border border-outline-variant/10">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent z-10"></div>
                  <video
                    src="https://videos.pexels.com/video-files/3195394/3195394-hd_1920_1080_25fps.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  
                  <div className="relative z-20 w-full flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="text-white space-y-2">
                      <span className="bg-tertiary/95 text-on-tertiary text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider font-body">
                        Treino Recomendado {hasExceededKcal ? "• ADAPTADO" : ""}
                      </span>
                      <h3 className="text-3xl font-headline font-bold leading-tight">
                        Full Body Flow &amp; Core
                      </h3>
                      <div className="flex items-center gap-4 text-white/90 text-sm font-semibold font-body">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-tertiary-fixed" /> {totalTrainingTime} min
                        </span>
                        <span className="flex items-center gap-1">
                          <Flame className="w-4 h-4 text-primary-fixed" /> {trainingTargetBurn} kcal
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4 text-secondary-fixed" /> {trainingIntensity}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setActiveTab("workouts");
                        triggerToast("A carregar sequência de exercícios adaptada.");
                      }}
                      className="bg-white text-primary font-bold px-6 py-3 rounded-xl hover:bg-primary hover:text-white transition-all duration-300 shadow-xl text-sm"
                    >
                      Começar Agora
                    </button>
                  </div>
                </section>

                {/* Hydration / Motivational quote */}
                <section className="md:col-span-4 bg-tertiary-fixed rounded-2xl p-6 flex flex-col justify-between border border-tertiary/10 shadow-sm text-on-tertiary-fixed">
                  <div>
                    <div className="flex items-center gap-2 text-tertiary mb-3">
                      <Droplet className="w-6 h-6 animate-bounce text-primary" />
                      <span className="font-extrabold uppercase text-xs tracking-wider font-body">Água &amp; Hidratação</span>
                    </div>
                    <h4 className="font-headline text-lg font-bold leading-tight text-on-tertiary-fixed-variant">
                      Dica de Hidratação
                    </h4>
                    <p className="text-sm text-on-tertiary-fixed-variant/85 mt-2 font-body leading-relaxed">
                      Beba 250ml de água logo após acordar para despertar o seu metabolismo e melhorar a clareza mental rápida.
                    </p>
                    <div className="mt-4 p-3 bg-white/70 rounded-xl">
                      <p className="text-xs font-bold font-body">Consumo: {waterIntake} ml / 2000 ml</p>
                      <div className="w-full bg-surface-variant rounded-full h-1.5 mt-1">
                        <div className="bg-primary h-1.5 rounded-full" style={{ width: `${Math.min((waterIntake / 2000) * 100, 100)}%` }}></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-4 pt-4 border-t border-tertiary/20">
                    <button
                      onClick={() => {
                        const newWater = waterIntake + 250;
                        setWaterIntake(newWater);
                        saveState(profile, meals, newWater);
                        triggerToast("+250ml adicionados!");
                      }}
                      className="flex-1 bg-primary text-on-primary text-xs font-bold py-2 rounded-lg hover:opacity-90 font-body"
                    >
                      + 250ml Flacon
                    </button>
                    <button
                      onClick={() => {
                        const newWater = waterIntake + 500;
                        setWaterIntake(newWater);
                        saveState(profile, meals, newWater);
                        triggerToast("+500ml adicionados!");
                      }}
                      className="flex-1 bg-tertiary text-on-tertiary text-xs font-bold py-2 rounded-lg hover:opacity-90 font-body"
                    >
                      + 500ml Garrafa
                    </button>
                  </div>
                </section>
              </div>

              {/* Action History Feed */}
              <section className="bg-surface-container rounded-2xl p-6 border border-outline-variant/10">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-headline font-semibold text-on-surface">Histórico Coletado Recente</h3>
                  <button onClick={() => setActiveTab("diary")} className="text-primary font-bold text-xs hover:underline">
                    Ver Diário Completo
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-body">
                  <div className="bg-surface p-3.5 rounded-xl flex items-center gap-3.5 border border-outline-variant/20 hover:shadow-sm">
                    <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary">
                      <Utensils className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold truncate max-w-[120px]">Pequeno-Almoço</p>
                      <p className="text-[10px] text-on-surface-variant font-bold">320 kcal • 08:30</p>
                    </div>
                  </div>

                  <div className="bg-surface p-3.5 rounded-xl flex items-center gap-3.5 border border-outline-variant/20 hover:shadow-sm">
                    <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary">
                      <Utensils className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold truncate max-w-[120px]">Almoço</p>
                      <p className="text-[10px] text-on-surface-variant font-bold">540 kcal • 13:15</p>
                    </div>
                  </div>

                  <div className="bg-surface p-3.5 rounded-xl flex items-center gap-3.5 border border-outline-variant/20 hover:shadow-sm">
                    <div className="w-10 h-10 rounded-full bg-tertiary/15 flex items-center justify-center text-tertiary">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold truncate max-w-[120px]">Corrida Matinal</p>
                      <p className="text-[10px] text-on-surface-variant font-bold">5.2 km • 07:00</p>
                    </div>
                  </div>

                  <div className="bg-surface p-3.5 rounded-xl flex items-center gap-3.5 border border-outline-variant/20 hover:shadow-sm">
                    <div className="w-10 h-10 rounded-full bg-secondary/15 flex items-center justify-center text-secondary">
                      <Droplet className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold truncate max-w-[120px]">Água Ingerida</p>
                      <p className="text-[10px] text-on-surface-variant font-bold">{waterIntake} ml • Hoje</p>
                    </div>
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {/* TAB 2: Diário Alimentar Timeline View */}
          {activeTab === "diary" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              {/* Daily quick energy and protein display */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-2 bg-primary-container/20 p-6 rounded-2xl border border-primary/20 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-end mb-3">
                    <div>
                      <p className="text-xs font-bold text-primary uppercase tracking-wider font-body">Energia Diária</p>
                      <h3 className="text-3xl font-extrabold text-on-background mt-1 font-body">
                        {totalKcal} <span className="text-base font-normal text-on-surface-variant/70">/ {kcalTarget} kcal</span>
                      </h3>
                    </div>
                    <span className="text-lg font-bold text-primary font-body">{kcalPct}%</span>
                  </div>
                  <div className="w-full bg-surface-container rounded-full h-3">
                    <div className="bg-primary h-3 rounded-full" style={{ width: `${Math.min(kcalPct, 100)}%` }}></div>
                  </div>
                </div>

                <div className="bg-surface-container p-5 rounded-2xl border border-outline-variant/20 flex flex-col justify-between font-body">
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Proteína Diária</p>
                  <div className="mt-2">
                    <h4 className="text-2xl font-extrabold text-on-surface">{totalProtein}g</h4>
                    <p className="text-xs text-on-surface-variant/60 font-semibold">Meta: {proteinTarget}g</p>
                  </div>
                </div>

                <div className="bg-tertiary-container/20 p-5 rounded-2xl border border-tertiary/10 flex flex-col justify-between font-body animate-shimmer">
                  <p className="text-xs font-bold text-tertiary uppercase tracking-wider">Nutricional Geral</p>
                  <div className="mt-2">
                    <div className="flex items-center gap-1.5 text-primary text-xs font-extrabold mb-1">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      <span>Excelente aporte</span>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-0.5">Glúten e Lactose sob controlo</p>
                  </div>
                </div>
              </div>

              {/* Chronological Meal timeline list */}
              <div className="relative pl-6 md:pl-10 space-y-12">
                {/* Visual anchor vertical bar */}
                <div className="absolute left-[11px] md:left-[19px] top-4 bottom-4 w-1 bg-outline-variant/30"></div>

                {meals.length === 0 ? (
                  <div className="text-center py-16 bg-surface-container rounded-2xl border border-dashed border-outline-variant/30">
                    <Utensils className="w-12 h-12 text-on-surface-variant/40 mx-auto mb-3" />
                    <p className="text-lg font-bold">Nenhuma refeição registrada hoje</p>
                    <p className="text-sm text-on-surface-variant mt-1">Carregue em &quot;Registar Refeição&quot; para analisar o seu prato!</p>
                  </div>
                ) : (
                  meals.map((meal) => (
                    <motion.div
                      key={meal.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="relative block"
                    >
                      {/* Timeline status indicator dot */}
                      <div className="absolute -left-[21px] md:-left-[29px] top-1.5 w-6 h-6 rounded-full bg-primary border-4 border-background z-10"></div>
                      
                      {/* Full Meal Card */}
                      <div className="bg-surface-container rounded-2xl border border-outline-variant/35 overflow-hidden flex flex-col lg:flex-row shadow-sm hover:border-primary/20 transition-all">
                        {/* Meal picture preview */}
                        <div className="lg:w-1/3 min-h-[180px] relative bg-surface-container-high">
                          <img
                            src={meal.image}
                            alt={meal.title}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        
                        {/* Nutrition details text details */}
                        <div className="flex-1 p-6 flex flex-col justify-between font-body">
                          <div>
                            <div className="flex justify-between items-center mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold bg-primary/10 text-primary px-3 py-1 rounded-full">{meal.time}</span>
                                <span className="text-xs font-bold bg-secondary-container text-on-secondary-container px-2.5 py-0.5 rounded-full uppercase tracking-wider">{meal.type}</span>
                              </div>
                            </div>
                            
                            <h4 className="text-xl font-headline font-bold text-on-surface mb-1.5">
                              {meal.title}
                            </h4>
                            <p className="text-sm text-on-surface-variant mb-4 leading-relaxed font-normal">
                              {meal.description}
                            </p>

                            <div className="flex flex-wrap gap-2 mb-5">
                              <span className="bg-surface px-3 py-1.5 rounded-lg text-xs font-bold border border-outline-variant/20">{meal.kcal} kcal</span>
                              <span className="bg-surface px-3 py-1.5 rounded-lg text-xs font-bold border border-outline-variant/20">{meal.protein}g Proteína</span>
                              <span className="bg-surface px-3 py-1.5 rounded-lg text-xs font-bold border border-outline-variant/20">{meal.carbs}g Hidratos</span>
                              <span className="bg-surface px-3 py-1.5 rounded-lg text-xs font-bold border border-outline-variant/20">{meal.fat}g Lípidos</span>
                            </div>
                          </div>

                          {/* Coach comment analytics card block */}
                          <div className="bg-primary/5 p-4 rounded-xl border-l-4 border-primary">
                            <p className="text-xs text-primary font-bold flex items-center gap-1.5">
                              <Sparkles className="w-4 h-4" />
                              <span>Análise do Coach Inteligente</span>
                            </p>
                            <p className="text-xs text-on-surface-variant mt-1.5 italic leading-relaxed font-normal">
                              &quot;{meal.coachFeedback}&quot;
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 3: Treinos Dinâmicos View */}
          {activeTab === "workouts" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              {/* Dynamic adjustment alert card notification */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Active engine controller alert box */}
                <div className={`lg:col-span-7 rounded-2xl p-7 flex flex-col md:flex-row gap-5 border transition-all relative overflow-hidden ${
                  hasExceededKcal
                  ? "bg-tertiary-container/20 border-tertiary-container/40"
                  : "bg-primary/5 border-primary/25"
                }`}>
                  <div className="z-10 flex-1 font-body">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className={`w-5 h-5 ${hasExceededKcal ? "text-tertiary animate-bounce" : "text-primary"}`} />
                      <span className={`font-extrabold tracking-widest uppercase text-xs ${hasExceededKcal ? "text-tertiary" : "text-primary"}`}>
                        Ajuste Ativo Motor Inteligente
                      </span>
                    </div>

                    <h3 className="text-2xl font-headline font-bold text-on-tertiary-container mb-2 leading-snug">
                      {hasExceededKcal 
                        ? "Treino Intensificado para Equilíbrio Calórico" 
                        : "Treino Equilibrado no Objetivo"
                      }
                    </h3>

                    <p className="text-sm text-on-surface-variant/90 leading-relaxed font-normal">
                      {hasExceededKcal 
                        ? `Hoje adicionamos +15 min de HIIT Cardio compensatório ("Burpees Explosivos"). Detetámos ingestão superior ao planeado diário (+${totalKcal - 1000} kcal desde o almoço).`
                        : "A sua alimentação está equilibrada com o planeado. Mantemos a sequência de fortalecimento muscular muscular padrão sem cardio compensatório."
                      }
                    </p>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <div className="bg-surface/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-outline-variant/30 text-center">
                        <span className="block text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">Estado Hoje</span>
                        <span className={`text-sm font-extrabold ${hasExceededKcal ? "text-rose-600" : "text-primary"}`}>
                          {hasExceededKcal ? "Excedente Ativo" : "Equilibrado"}
                        </span>
                      </div>
                      <div className="bg-surface/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-outline-variant/30 text-center">
                        <span className="block text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">Compensação</span>
                        <span className="text-sm font-extrabold text-tertiary">
                          {hasExceededKcal ? "+15 min Cardio" : "0 min Padrão"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Training Summary specifications side stats card */}
                <div className="lg:col-span-5 bg-surface-container rounded-2xl p-7 border border-outline-variant/10 shadow-custom flex flex-col justify-between">
                  <h3 className="text-lg font-headline font-bold text-on-surface mb-4">Estatísticas do Plano</h3>
                  
                  <div className="space-y-3 font-body">
                    <div className="flex justify-between items-center p-3 bg-background rounded-xl border border-outline-variant/20">
                      <div className="flex items-center gap-2 text-on-surface-variant text-sm font-semibold">
                        <Clock className="w-4 h-4 text-primary" />
                        <span>Duração de Treino</span>
                      </div>
                      <span className="font-extrabold text-base">{totalTrainingTime} min</span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-background rounded-xl border border-outline-variant/20">
                      <div className="flex items-center gap-2 text-on-surface-variant text-sm font-semibold">
                        <Dumbbell className="w-4 h-4 text-primary" />
                        <span>Intensidade Recomendada</span>
                      </div>
                      <span className={`font-extrabold text-base uppercase ${hasExceededKcal ? "text-tertiary" : "text-primary"}`}>
                        {trainingIntensity}
                      </span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-background rounded-xl border border-outline-variant/20">
                      <div className="flex items-center gap-2 text-on-surface-variant text-sm font-semibold">
                        <Flame className="w-4 h-4 text-primary" />
                        <span>Estimativa de Gasto</span>
                      </div>
                      <span className="font-extrabold text-base text-rose-600">{trainingTargetBurn} kcal</span>
                    </div>
                  </div>

                  <button
                    onClick={() => triggerToast("Treino iniciado! Registaremos o gasto calórico quando terminar.")}
                    className="w-full mt-5 bg-primary text-on-primary py-3 px-4 font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-current text-tertiary-fixed" />
                    <span>Começar Treino</span>
                  </button>
                </div>
              </div>

              {/* Sequential exercise cards layout */}
              <section className="space-y-5">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-headline font-bold">Sequência Recomendada de Hoje</h3>
                  <span className="text-xs text-on-surface-variant font-bold font-body">
                    {activeWorkoutExercises.length} Exercícios em ordem
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-body">
                  {activeWorkoutExercises.map((exercise, index) => (
                    <motion.div
                      key={exercise.name}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`bg-surface-container rounded-2xl p-5 flex gap-5 border shadow-sm relative group hover:border-primary/20 transition-all ${
                        exercise.isAdapted ? "border-tertiary/20" : "border-outline-variant/15"
                      }`}
                    >
                      {/* Badge marker for dynamically added HIIT exercises */}
                      {exercise.isAdapted && (
                        <span className="absolute -top-2.5 -right-2 bg-primary text-on-primary text-[10px] px-3 py-1 rounded-full font-bold shadow-sm flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-tertiary-fixed animate-pulse" />
                          <span>ADAPTADO IA</span>
                        </span>
                      )}

                      {/* Image Preview */}
                      <div className="w-20 h-20 bg-surface rounded-xl overflow-hidden relative flex-shrink-0">
                        <img src={exercise.image} alt={exercise.name} className="w-full h-full object-cover" />
                      </div>

                      {/* Specs */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-base text-on-surface truncate pr-1">
                            {index + 1}. {exercise.name}
                          </h4>
                          <span className="bg-primary/10 text-primary text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            {exercise.type}
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant font-semibold mt-1">
                          {exercise.reps}
                        </p>
                        <div className="flex items-center gap-3 mt-3 text-[10px] text-on-surface-variant font-bold uppercase">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-primary" /> {exercise.duration} min
                          </span>
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5 text-primary" /> {exercise.intensity}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Dynamic bottom note regarding calculations */}
              <footer className="bg-surface-container-low border border-outline-variant/15 rounded-xl p-5 text-center font-body text-xs text-on-surface-variant/85 max-w-xl mx-auto leading-relaxed">
                Os seus treinos diários são recalculados em tempo real pela inteligência artificial. Se não puder compensar ou treinar hoje, informe o seu Diário Alimentar e ajustaremos o plano de calorias de amanhã!
              </footer>
            </motion.div>
          )}

          {/* TAB 4: Perfil Biométrico e Clínico View */}
          {activeTab === "profile" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8 animate-fade-in"
            >
              {/* Premium profile header card */}
              <section className="bg-surface-container-low border border-outline-variant/20 p-8 rounded-2xl relative overflow-hidden flex flex-col md:flex-row items-center gap-6">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
                  <Leaf className="w-36 h-36" />
                </div>

                {/* Profile photograph circle */}
                <div className="relative">
                  <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-primary ring-8 ring-primary/10">
                    <img
                      src={user?.photoURL || "https://lh3.googleusercontent.com/aida-public/AB6AXuCKzu4bVtb_3HP8V7sOUZ9LSK6HE21SLYmW8farRnZ0vXF0vpJMcdE3v5zn4CPAAR9oEevqR9d7KUUAu_xcJJUg7py2nhJEstdYz88ET6XOju8uVTqz8e8S6qYn6KrEdaVRN4HffZvOvOa99tu3X_p3tBQcF0JgnDa2j0Ql3nVLkZWzSIrPxA0KlcomKG2y6eO7Moeyz-298vUMbbP8smX6bdKuVqi_1eGyqz3tC2gctrYSCeDL2Hy6wgFHAUUkCwhryfvB-8XTtW-q"}
                      alt="Ana Silva"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-md text-primary hover:scale-105 active:scale-95 transition-transform border border-outline-variant/15">
                    <Camera className="w-4 h-4" />
                  </button>
                </div>

                {/* Premium tag descriptions */}
                <div className="text-center md:text-left flex-1 font-body">
                  <div className="flex flex-wrap items-center gap-2.5 justify-center md:justify-start">
                    <h3 className="text-2xl font-headline font-bold text-on-surface">
                      {profile.name}
                    </h3>
                    <span className="bg-tertiary-fixed text-on-tertiary-fixed text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-current text-amber-500" />
                      <span>Premium Member</span>
                    </span>
                  </div>
                  
                  <p className="text-xs text-on-surface-variant font-medium mt-1">
                    Membro Ativo desde Outubro 23 • {profile.location}
                  </p>

                  <div className="flex flex-wrap gap-2 justify-center md:justify-start mt-4">
                    <span className="bg-primary-container/20 text-on-primary-fixed-variant px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider">
                      Foco: {profile.goal}
                    </span>
                    <span className="bg-secondary-container text-on-secondary-container px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider">
                      Nível: {profile.level}
                    </span>
                  </div>
                </div>

                {/* Edit profile actions buttons container */}
                <div className="flex gap-2 w-full md:w-auto">
                  <button
                    onClick={() => {
                      localStorage.clear();
                      handleResetApp();
                    }}
                    className="flex-1 md:flex-none px-4 py-2.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl font-body font-bold text-sm border border-rose-200"
                  >
                    Fazer Reset
                  </button>
                  <button
                    onClick={openEditProfileModal}
                    className="flex-1 md:flex-none px-5 py-2.5 bg-primary text-on-primary hover:opacity-90 rounded-xl font-body font-bold text-sm shadow-md"
                  >
                    Editar Perfil
                  </button>
                </div>
              </section>

              {/* Editing details form display */}
              {isEditingProfile && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-surface-container rounded-2xl p-6 border border-primary/20 space-y-4 shadow-lg"
                >
                  <h4 className="font-headline text-lg font-bold text-primary flex items-center gap-2">
                    <Edit2 className="w-5 h-5" />
                    <span>Modificar Valores Biométricos &amp; Restrições</span>
                  </h4>
                  <form onSubmit={handleSaveProfileEdit} className="space-y-4 text-xs font-body">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block font-bold mb-1">Nome</label>
                        <input
                          type="text"
                          required
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block font-bold mb-1">Idade</label>
                        <input
                          type="number"
                          required
                          value={profileAge}
                          onChange={(e) => setProfileAge(Number(e.target.value))}
                          className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block font-bold mb-1">Peso (kg)</label>
                        <input
                          type="number"
                          step="0.1"
                          required
                          value={profileWeight}
                          onChange={(e) => setProfileWeight(Number(e.target.value))}
                          className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block font-bold mb-1">Altura (m)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={profileHeight}
                          onChange={(e) => setProfileHeight(Number(e.target.value))}
                          className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold mb-1">Objetivo Fitness</label>
                        <select
                          value={profileGoal}
                          onChange={(e) => setProfileGoal(e.target.value)}
                          className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2"
                        >
                          <option value="Manutenção de Peso">Manutenção de Peso</option>
                          <option value="Perda de Gordura">Perda de Gordura (Défice)</option>
                          <option value="Ganho de Massa">Ganho de Massa (Superavit)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-bold mb-1">Nível de Experiência</label>
                        <select
                          value={profileLevel}
                          onChange={(e) => setProfileLevel(e.target.value)}
                          className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2"
                        >
                          <option value="Principiante">Principiante</option>
                          <option value="Intermédio">Intermédio</option>
                          <option value="Avançado">Avançado</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold mb-1">Restrições (Separadas por vírgula)</label>
                        <input
                          type="text"
                          value={profileAllergiesStr}
                          onChange={(e) => setProfileAllergiesStr(e.target.value)}
                          className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block font-bold mb-1">Medicações (Separadas por vírgula)</label>
                        <input
                          type="text"
                          value={profileMedsStr}
                          onChange={(e) => setProfileMedsStr(e.target.value)}
                          className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(false)}
                        className="px-4 py-2 hover:bg-surface-variant/40 rounded-lg font-bold"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-primary text-on-primary rounded-lg font-bold shadow-sm"
                      >
                        Salvar Alterações
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* Bento grid content sections */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Biometric Data visual displays */}
                <div className="col-span-12 md:col-span-8 bg-surface-container rounded-2xl p-6 border border-outline-variant/10 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2 text-primary">
                      <Scale className="w-5 h-5 text-primary" />
                      <h4 className="text-lg font-headline font-bold text-on-surface">Dados Biométricos Atuais</h4>
                    </div>
                    <button onClick={openEditProfileModal} className="text-xs text-primary font-bold flex items-center gap-1 hover:underline">
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar Métricas</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-body">
                    <div className="bg-surface p-4 rounded-xl flex flex-col items-center border border-outline-variant/15">
                      <span className="text-xs text-on-surface-variant/80 font-bold uppercase tracking-wider mb-1">Peso Atual</span>
                      <span className="text-2xl font-extrabold text-on-surface">
                        {profile.weight} <span className="text-xs font-normal">kg</span>
                      </span>
                      <div className="mt-2 text-[10px] text-primary flex items-center gap-1 font-bold">
                        <TrendingDown className="w-3 h-3 text-primary" />
                        <span>Progresso equilibrado</span>
                      </div>
                    </div>

                    <div className="bg-surface p-4 rounded-xl flex flex-col items-center border border-outline-variant/15 font-body">
                      <span className="text-xs text-on-surface-variant/80 font-bold uppercase tracking-wider mb-1">Altura declarada</span>
                      <span className="text-2xl font-extrabold text-on-surface">
                        {profile.height} <span className="text-xs font-normal">m</span>
                      </span>
                      <span className="text-[10px] text-on-surface-variant/50 mt-2">Calculável para IMC</span>
                    </div>

                    <div className="bg-surface p-4 rounded-xl flex flex-col items-center border border-outline-variant/15 font-body">
                      <span className="text-xs text-on-surface-variant/80 font-bold uppercase tracking-wider mb-1">Idade cronológica</span>
                      <span className="text-2xl font-extrabold text-on-surface">
                        {profile.age} <span className="text-xs font-normal">anos</span>
                      </span>
                      <span className="text-[10px] text-on-surface-variant/50 mt-2">Zona metabólica ativa</span>
                    </div>
                  </div>

                  <div className="mt-6 pt-5 border-t border-outline-variant/20 font-body">
                    <div className="flex md:flex-row flex-col justify-between items-start md:items-end gap-3">
                      <div>
                        <p className="text-xs text-on-surface-variant font-bold">Índice de Massa Corporal (IMC)</p>
                        <p className="text-xl font-extrabold text-on-surface mt-1">
                          {bmiData.value}{" "}
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded uppercase ml-2 ${bmiData.colorClass}`}>
                            {bmiData.category}
                          </span>
                        </p>
                      </div>
                      <div className="w-full md:w-1/2 h-2.5 bg-surface-variant rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${Math.min(Number(bmiData.value) * 2.5, 100)}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main fitness goal shortcuts card */}
                <div className="col-span-12 md:col-span-4 bg-tertiary-container/15 p-6 rounded-2xl border border-tertiary/20 flex flex-col justify-between font-body">
                  <div className="flex items-center gap-2 text-tertiary mb-3">
                    <Target className="w-5 h-5" />
                    <h4 className="text-base font-headline font-bold text-on-surface">Objetivo Planner</h4>
                  </div>
                  
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-outline-variant/15">
                    <p className="text-[10px] font-bold text-tertiary uppercase tracking-wider mb-1">Estilo Preferencial</p>
                    <p className="text-base font-extrabold">{profile.goal}</p>
                    <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed font-normal">
                      Estabilizar ingestão de nutrientes diária e manter treinos {meals.length > 2 && hasExceededKcal ? "fortalecidos" : "adequados"}.
                    </p>
                  </div>

                  <div className="mt-4 p-3 bg-primary/10 rounded-xl">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Comprometimento</p>
                    <p className="text-xs font-semibold text-on-surface-variant/90 mt-1">
                      Membro Premium ativo. Renovação automática em Outubro de 2026.
                    </p>
                  </div>
                </div>
              </div>

              {/* Bio Dietary Restrictions & Active Medication */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <section className="bg-surface-container rounded-2xl p-6 border border-outline-variant/10 shadow-sm font-body">
                  <div className="flex items-center gap-2 text-primary mb-4">
                    <Ban className="w-5 h-5 text-primary" />
                    <h4 className="text-lg font-headline font-bold">Clínico &amp; Restrições Alimentares</h4>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h5 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                        Restrições Declaradas:
                      </h5>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.allergies.length === 0 ? (
                          <span className="text-xs text-on-surface-variant font-normal">Nenhuma restrição alimentar declarada.</span>
                        ) : (
                          profile.allergies.map((allergy) => (
                            <span key={allergy} className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-lg text-xs font-bold border border-outline-variant/10 shadow-sm">
                              {allergy}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="pt-2">
                      <h5 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Pill className="w-4 h-4 text-primary" /> Suplementos &amp; Medicação Ativa:
                      </h5>
                      <ul className="space-y-2">
                        {profile.medications.length === 0 ? (
                          <li className="text-xs text-on-surface-variant/80 font-normal">Nenhuma medicação catalogada.</li>
                        ) : (
                          profile.medications.map((med) => (
                            <li key={med} className="flex items-center justify-between p-3 bg-surface rounded-lg border border-outline-variant/10 text-xs">
                              <span className="font-bold">{med}</span>
                              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">1x ao Pequeno Almoço</span>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  </div>
                </section>

                {/* Account details & safety settings template layout */}
                <section className="bg-surface-container rounded-2xl p-6 border border-outline-variant/10 shadow-sm font-body">
                  <div className="flex items-center gap-2 text-primary mb-4">
                    <Lock className="w-5 h-5 text-primary" />
                    <h4 className="text-lg font-headline font-bold">Definições &amp; Segurança</h4>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 hover:bg-surface rounded-xl transition-colors cursor-pointer border border-outline-variant/15">
                      <div>
                        <p className="text-xs font-bold font-body">Email Registado</p>
                        <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">ivogarcia@esad.pt</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-on-surface-variant/70" />
                    </div>

                    <div className="flex justify-between items-center p-3 hover:bg-surface rounded-xl transition-colors cursor-pointer border border-outline-variant/15">
                      <div>
                        <p className="text-xs font-bold font-body">Palavra-passe e Autenticação</p>
                        <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">Renovada há 3 meses</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-on-surface-variant/70" />
                    </div>

                    <div className="flex justify-between items-center p-3 hover:bg-surface rounded-xl transition-colors cursor-pointer border border-outline-variant/15">
                      <div>
                        <p className="text-xs font-bold font-body">Preferências de Notificação</p>
                        <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">Push móvel ativos via WhatsApp</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-on-surface-variant/70" />
                    </div>
                  </div>

                  <div className="pt-3">
                    <button
                      onClick={user ? handleGoogleLogout : handleResetApp}
                      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-rose-50 text-rose-700 transition-colors border border-rose-200 mt-2"
                    >
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <LogOut className="w-4 h-4" />
                        <span>{user ? "Terminar Sessão Google Cloud" : "Terminar Sessão (Limpar Memória)"}</span>
                      </div>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </section>
              </div>

              {/* Motivator quote footer */}
              <div className="pt-8 border-t border-outline-variant/20 text-center text-on-surface-variant/70 italic max-w-md mx-auto font-headline text-base">
                &quot;O sucesso é a soma de pequenos esforços repetidos dia após dia.&quot;
                <div className="text-xs font-body font-bold text-on-surface not-italic mt-1.5">— Robert Collier</div>
              </div>
            </motion.div>
          )}

        </main>
      </div>

      {/* MODAL WINDOW: Registar e Analisar Refeição por IA Vision */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            
            {/* Overlay background */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsUploadModalOpen(false)}
              className="absolute inset-0 bg-on-background/40 backdrop-blur-sm"
            ></motion.div>

            {/* Modal Body content card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-surface w-full max-w-xl mx-4 rounded-2xl shadow-2xl overflow-hidden border border-outline-variant/30 flex flex-col max-h-[90vh]"
            >
              <div className="p-5 border-b border-outline-variant/20 flex justify-between items-center bg-surface-container">
                <h3 className="font-headline text-xl font-bold text-primary flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  <span>Analisar Nova Refeição com IA</span>
                </h3>
                <button
                  onClick={() => setIsUploadModalOpen(false)}
                  className="text-on-surface-variant hover:text-rose-600 transition-colors p-1 rounded-full hover:bg-surface-variant"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-5 flex-1 font-body">

                {/* STEP 1: Image Drag, select options, preset shortcuts */}
                {uploadStep === 1 && (
                  <div className="space-y-4">
                    <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
                      Selecione um tipo de refeição, insira uma breve descrição (opcional) ou selecione um dos nossos <span className="font-bold text-primary">presets demonstrativos</span> para simular o processo da Gemini!
                    </p>

                    <div className="grid grid-cols-4 gap-2 text-xs">
                      {["Pequeno-Almoço", "Almoço", "Lanche", "Jantar"].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setSelectedMealType(m)}
                          className={`py-2 px-1 text-center rounded-lg font-bold border transition-colors ${
                            selectedMealType === m
                              ? "bg-primary text-on-primary border-primary"
                              : "bg-surface border-outline-variant/35 text-on-surface-variant hover:bg-surface-variant"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>

                    {/* Pre-defined demo templates selection */}
                    <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30">
                      <p className="text-xs font-bold text-primary mb-2 flex items-center gap-1">
                        <Sparkles className="w-4 h-4" /> Presets de Demonstração (Pratos Reais)
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {presetFoodTemplates.map((preset, index) => (
                          <button
                            key={preset.title}
                            type="button"
                            onClick={() => handleLoadFoodPreset(index)}
                            className="bg-white p-2 text-left rounded-lg border border-outline-variant/20 hover:border-primary text-[11px] font-semibold block leading-tight truncate shadow-sm transition-colors"
                          >
                            <span className="font-bold text-on-surface block truncate">{preset.title}</span>
                            <span className="text-[9px] text-primary font-bold">{preset.kcal} kcal</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Image Drag and Drop block space */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`relative aspect-video border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors group ${
                        isDragging
                          ? "bg-primary/10 border-primary"
                          : uploadedImage
                          ? "bg-surface border-primary/40"
                          : "bg-primary/5 border-primary/20 hover:bg-primary/10"
                      }`}
                    >
                      {uploadedImage ? (
                        <div className="absolute inset-0 p-3 flex flex-col items-center justify-center">
                          <img
                            src={uploadedImage}
                            alt="Preview"
                            className="w-full h-full object-contain rounded-lg"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setUploadedImage(null);
                            }}
                            className="absolute top-2 right-2 bg-rose-600 text-white p-1 rounded-full shadow-md"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-center p-4">
                          <Upload className="w-10 h-10 text-primary/40 mx-auto group-hover:scale-110 transition-transform" />
                          <p className="font-bold text-primary text-sm mt-2">Arraste a fotografia aqui</p>
                          <p className="text-[10px] text-on-surface-variant/70 mt-1">
                            Ou clique para navegar nos ficheiros
                          </p>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                        </div>
                      )}
                    </div>

                    {/* Optional description input */}
                    <div>
                      <label className="block text-xs font-bold mb-1.5">O que tem no seu prato hoje? (Descrição opcional)</label>
                      <textarea
                        rows={2}
                        value={uploadedText}
                        onChange={(e) => setUploadedText(e.target.value)}
                        placeholder="Ex: Arroz, brócolos refogados e tofu grelhado..."
                        className="w-full border border-outline-variant rounded-xl bg-surface p-3 text-xs focus:outline-none"
                      />
                    </div>

                    <button
                      onClick={handleAnalyzeFood}
                      disabled={!uploadedImage && !uploadedText.trim()}
                      className="w-full bg-primary text-on-primary py-3.5 rounded-xl font-bold font-body transition-all hover:opacity-90 disabled:opacity-50 text-sm shadow-md"
                    >
                      Analisar com IA Gemini
                    </button>
                  </div>
                )}

                {/* STEP 2: Processing visual state animation spinner */}
                {uploadStep === 2 && (
                  <div className="flex flex-col items-center justify-center py-10 space-y-6">
                    <div className="relative w-20 h-20">
                      <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                      </div>
                    </div>
                    <div className="text-center font-body space-y-2">
                      <h4 className="text-lg font-bold text-on-surface">A identificar ingredientes...</h4>
                      <p className="text-xs text-on-surface-variant leading-relaxed animate-pulse">
                        A Gemini está a analisar a composição nutricional de acordo com as restrições e dados da Ana Silva.
                      </p>
                    </div>
                  </div>
                )}

                {/* STEP 3: Display results, adjustments allowing final manual tweak */}
                {uploadStep === 3 && geminiResult && (
                  <div className="space-y-4">
                    <div className="flex bg-primary/10 p-3 rounded-xl gap-2 font-body text-xs border border-primary/20">
                      <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <p className="text-primary leading-normal italic font-semibold">
                        Abaixo apresentamos a estimativa gerada. Pode ajustar os valores de calorias ou proteínas manualmente caso prefira personalizar as quantidades!
                      </p>
                    </div>

                    <div className="flex gap-4 items-center p-3 bg-surface-container rounded-xl">
                      <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-surface">
                        <img
                          src={uploadedImage || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=200"}
                          alt="Analyzed food"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        {geminiResult.alimentos_identificados.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {geminiResult.alimentos_identificados.map((i) => (
                              <span key={i} className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded">
                                {i}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-on-surface">Refeição Personalizada</span>
                        )}
                        <span className="text-xs text-on-surface-variant font-bold block mt-1">Identificado IA</span>
                      </div>
                    </div>

                    {/* Numeric Edit inputs for validation */}
                    <div className="bg-surface-container-low p-4 rounded-xl space-y-3">
                      <div className="grid grid-cols-4 gap-2 text-xs font-bold">
                        <div>
                          <label className="block text-on-surface-variant mb-1">Calorias (kcal)</label>
                          <input
                            type="number"
                            value={geminiResult.nutricao.kcal}
                            onChange={(e) => setGeminiResult({
                              ...geminiResult,
                              nutricao: { ...geminiResult.nutricao, kcal: Number(e.target.value) }
                            })}
                            className="w-full rounded bg-white border border-outline-variant px-2.5 py-1.5 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-on-surface-variant mb-1">Proteínas (g)</label>
                          <input
                            type="number"
                            value={geminiResult.nutricao.proteina_g}
                            onChange={(e) => setGeminiResult({
                              ...geminiResult,
                              nutricao: { ...geminiResult.nutricao, proteina_g: Number(e.target.value) }
                            })}
                            className="w-full rounded bg-white border border-outline-variant px-2.5 py-1.5"
                          />
                        </div>
                        <div>
                          <label className="block text-on-surface-variant mb-1">Carbs (g)</label>
                          <input
                            type="number"
                            value={geminiResult.nutricao.hidratos_g}
                            onChange={(e) => setGeminiResult({
                              ...geminiResult,
                              nutricao: { ...geminiResult.nutricao, hidratos_g: Number(e.target.value) }
                            })}
                            className="w-full rounded bg-white border border-outline-variant px-2.5 py-1.5"
                          />
                        </div>
                        <div>
                          <label className="block text-on-surface-variant mb-1">Gorduras (g)</label>
                          <input
                            type="number"
                            value={geminiResult.nutricao.lipidos_g}
                            onChange={(e) => setGeminiResult({
                              ...geminiResult,
                              nutricao: { ...geminiResult.nutricao, lipidos_g: Number(e.target.value) }
                            })}
                            className="w-full rounded bg-white border border-outline-variant px-2.5 py-1.5"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Qualitative feedback */}
                    <div className="bg-primary/5 p-4 rounded-xl border border-primary/25 text-xs font-body leading-relaxed">
                      <span className="font-bold text-primary block mb-1">Feedback do Coach Inteligente:</span>
                      <p className="text-on-surface-variant italic">&quot;{geminiResult.feedback_qualitativo}&quot;</p>
                    </div>

                    {/* Suggested workout modifications */}
                    <div className="bg-tertiary-container/15 p-4 rounded-xl border border-tertiary-container/30 text-xs font-body">
                      <span className="font-bold text-tertiary block mb-1 flex items-center gap-1">
                        <Zap className="w-4 h-4 fill-current" /> Plano de Treino Dinâmico:
                      </span>
                      <p className="font-bold text-on-surface mb-0.5">{geminiResult.ajuste_treino.sugestao}</p>
                      <p className="text-on-surface-variant leading-relaxed font-normal">{geminiResult.ajuste_treino.detalhe}</p>
                    </div>

                    {/* Back or submit triggers */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setUploadStep(1)}
                        className="px-4 py-3 bg-surface hover:bg-surface-variant border border-outline-variant/30 rounded-xl text-xs font-bold leading-none font-body text-on-surface flex items-center gap-1 cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Voltar</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={handleAddMealToDiary}
                        className="flex-1 bg-primary text-on-primary py-3 px-4 font-bold rounded-xl text-wrap hover:opacity-95 font-body flex items-center justify-center gap-1.5 text-xs shadow"
                      >
                        <CheckCircle2 className="w-4 h-4 text-tertiary-fixed" />
                        <span>Confirmar e Adicionar ao Diário</span>
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );

  // Helper trigger to scroll to page top when switching content tabs
  function triggerTabScroll() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}
