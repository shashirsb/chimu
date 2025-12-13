import React, { useEffect, useState } from "react";
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Link,
    useNavigate,
    useLocation
} from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import CreateUser from "./pages/CreateUser";
import EditUser from "./pages/EditUser";
import Accounts from "./pages/Accounts";
import CreateAccount from "./pages/CreateAccount";
import EditAccount from "./pages/EditAccount";
import Wigs from "./pages/Wigs";
import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./components/ProtectedRoute";
import WigProgress from "./pages/WigProgress";
import MapOrgChartPage from "./pages/MapOrgChartPage";
import Spoke from "./pages/Spoke";
import CreateSpoke from "./pages/CreateSpoke";
import EditSpoke from "./pages/EditSpoke";


// ⭐ FIXED TYPEWRITER + FADE MULTILINGUAL ANIMATION
function MultilingualToggle() {
    const phrases = [
        "One Team One Goal",                     // USA — English
        "एक टीम एक लक्ष्य",                         // India — Hindi
        "一个团队，一个目标",                      // China — Mandarin
        "Un equipo, un objetivo",                // Spain — Spanish
        "واحد الفريق، هدف واحد",                    // Saudi Arabia — Arabic
        "Uma equipe, um objetivo",               // Brazil — Portuguese
        "Une équipe, un objectif",               // France — French
        "Ona ekipa, en cilj",                    // Slovenia — Slovene
        "Одна команда, одна цель",                // Russia — Russian
        "Ein Team, ein Ziel",                    // Germany — German
        "Un team, un obiettivo",                 // Italy — Italian
        "한 팀, 한 목표",                            // South Korea — Korean
        "ワンチーム、ワンゴール",                     // Japan — Japanese
        "Bir takım, bir hedef",                  // Turkey — Turkish
        "Một đội, một mục tiêu",                 // Vietnam — Vietnamese
        "Ekipa moja, lengo moja",                // Kenya — Swahili
        "Một đội ngũ, một mục tiêu",             // Laos — Lao
        "Jedna ekipa, jedan cilj",               // Croatia — Croatian
        "Jedan tim, jedan cilj",                 // Serbia — Serbian
        "Egy csapat, egy cél",                   // Hungary — Hungarian
        "ทีมเดียว เป้าหมายเดียว",                     // Thailand — Thai
        "Unë skuadër, një synim",                // Albania — Albanian
        "Ekipi një, synimi një",                 // Kosovo — Albanian
        "Un echipă, un obiectiv",                // Romania — Romanian
        "Eén team, één doel",                    // Netherlands — Dutch
    ];

    const [index, setIndex] = useState(0);
    const [displayText, setDisplayText] = useState("");
    const [fade, setFade] = useState(true);

    useEffect(() => {
        const fullText = phrases[index];
        let charIndex = 0;

        setDisplayText("");
        setFade(true);

        // ⭐ FIXED TYPEWRITER (no undefined)
        const typer = setInterval(() => {
            if (charIndex < fullText.length) {
                setDisplayText(fullText.slice(0, charIndex + 1));
                charIndex++;
            } else {
                clearInterval(typer);
            }
        }, 80);

        // Swap phrase every 10 seconds
        const timer = setTimeout(() => {
            setFade(false);
            setTimeout(() => {
                setIndex((prev) => (prev + 1) % phrases.length);
            }, 300);
        }, 10000);

        return () => {
            clearInterval(typer);
            clearTimeout(timer);
        };
    }, [index]);

    return (
        <div
            className={`
                hidden md:block text-gray-700 font-medium h-6 
                transition-opacity duration-500
                ${fade ? "opacity-100" : "opacity-0"}
            `}
        >
            {displayText}
        </div>
    );
}



function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const isLoginPage = location.pathname === "/login";

    if (isLoginPage) return null;

    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate("/login");
    };

    return (
        <nav className="bg-white shadow-md">
            <div className="container mx-auto px-6 py-3 flex justify-between items-center">

                {/* LEFT: Logo + Multilingual Animation */}
                <div className="flex items-center space-x-6">

                    {/* Logo */}
                    <div
                        className="text-2xl font-bold text-green-600 flex items-center cursor-pointer"
                        onClick={() => navigate("/")}
                    >
                        <img
                            src="https://i.pinimg.com/1200x/b2/31/7e/b2317e8174e5fcef57c74c662f57d155.jpg"
                            alt="Logo"
                            className="w-8 h-8 mr-2"
                        />
                        <span className="text-2xl font-bold text-green-600">Chimu</span>
                    </div>

                    {/* ⭐ Animated Multilingual Text */}
                    <MultilingualToggle />
                </div>

                {/* RIGHT: Menu links */}
                <div className="space-x-4 flex items-center">

                    <Link to="/" className="text-gray-700 hover:text-green-600">Dashboard</Link>
                    <Link to="/wigs" className="text-gray-700 hover:text-green-600">All Works</Link>
                    <Link to="/spoke" className="text-gray-700 hover:text-green-600">Spoke</Link>
                    <Link to="/org-chart" className="text-gray-700 hover:text-green-600">Org Chart</Link>
                    <Link to="/accounts" className="text-gray-700 hover:text-green-600">Accounts</Link>
                    <Link to="/users" className="text-gray-700 hover:text-green-600">Users</Link>




                    <button
                        onClick={handleLogout}
                        className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition"
                    >
                        Logout
                    </button>
                </div>

            </div>
        </nav>
    );
}



export default function App() {
    return (
        <Router>
            <div className="min-h-screen bg-gray-50">
                <Navbar />

                <div className="container mx-auto px-6 py-8">
                    <Routes>

                        <Route path="/login" element={<LoginPage />} />

                        <Route
                            path="/"
                            element={
                                <ProtectedRoute>
                                    <Dashboard />
                                </ProtectedRoute>
                            }
                        />

                        <Route
                            path="/users"
                            element={
                                <ProtectedRoute>
                                    <Users />
                                </ProtectedRoute>
                            }
                        />

                        <Route path="/users/new" element={<CreateUser />} />
                        <Route path="/users/:id/edit" element={<EditUser />} />

                        <Route
                            path="/accounts"
                            element={
                                <ProtectedRoute>
                                    <Accounts />
                                </ProtectedRoute>
                            }
                        />

                        <Route path="/accounts/new" element={<CreateAccount />} />
                        <Route path="/accounts/:id/edit" element={<EditAccount />} />

                        <Route
                            path="/wigs"
                            element={
                                <ProtectedRoute>
                                    <Wigs />
                                </ProtectedRoute>
                            }
                        />

                        <Route path="/wigs/:id/progress" element={<WigProgress />} />

                        <Route
                            path="/org-chart"
                            element={
                                <ProtectedRoute>
                                    <MapOrgChartPage />
                                </ProtectedRoute>
                            }
                        />

                        <Route path="/spoke" element={<Spoke />} />
                        <Route path="/spoke/new" element={<CreateSpoke />} />
                        <Route path="/spoke/:id/edit" element={<EditSpoke />} />

                    </Routes>
                </div>
            </div>
        </Router>
    );
}
