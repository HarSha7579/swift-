import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { useTheme } from "../context/ThemeContext";
import { agentAPI, ticketAPI, kbAPI, userAPI } from "../services/api";

import {
  LayoutDashboard,
  Ticket,
  PlusCircle,
  BookOpen,
  User,
  LogOut,
  Bell,
  Menu,
  X,
  MessageSquare,
  Users,
  UserCog,
  Check,
  Trash2,
  Moon,
  Sun,
  Zap,
  ChevronDown,
} from "lucide-react";

import { motion, AnimatePresence } from "motion/react";


const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  const { user, logout, updateUserAvailability } = useAuth();
  const { notifications, unreadCount, markRead, deleteNotification } =
    useNotifications();

  const { theme, toggleTheme } = useTheme();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();


  const notifRef = useRef<HTMLDivElement>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  // ---------------- SEARCH ----------------

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);



  const toggleNotifDropdown = () => {

    if (!notifDropdownOpen) {
      setSidebarOpen(false);
    }

    setNotifDropdownOpen(prev => !prev);
  };



  const handleMouseEnter = () => {

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

  };



  const handleMouseLeave = () => {

    if (notifDropdownOpen) {

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }


      timerRef.current = setTimeout(() => {
        setNotifDropdownOpen(false);
      },3000);

    }

  };



  useEffect(() => {

    if (!notifDropdownOpen && timerRef.current) {

      clearTimeout(timerRef.current);
      timerRef.current = null;

    }

  },[notifDropdownOpen]);





  // ---------------- GLOBAL SEARCH ----------------


  useEffect(() => {


    const fetchSearchResults = async () => {


      const query = searchQuery.trim();


      if(query.length < 2){

        setSearchResults([]);
        return;

      }



      setIsSearching(true);



      try {


        const results:any[] = [];



        // Knowledge Base Search

        const kbPromise = kbAPI.list({search:query})

        .then((data:any)=>{


          if(Array.isArray(data)){


            data.slice(0,5).forEach((item:any)=>{


              results.push({

                id:`kb-${item.id}`,

                title:item.title,

                subtitle:`Article • ${item.category}`,

                category:"Knowledge Base",

                url:"/kb",

                state:{
                  expandKbId:item.id
                }

              });


            });


          }


        })

        .catch(err=>console.error("KB search error:",err));






        // Ticket Search


        const ticketPromise = ticketAPI.list({search:query})

        .then((data:any)=>{


          if(Array.isArray(data)){


            data.slice(0,5).forEach((item:any)=>{


              results.push({

                id:`ticket-${item.id}`,

                title:item.subject,

                subtitle:
                `Ticket #${item.id} • ${item.status?.replace("_"," ") || "UNKNOWN"}`,

                category:"Tickets",

                url:`/tickets/${item.id}`

              });


            });


          }


        })

        .catch(err=>console.error("Ticket search error:",err));





        let staffPromises:Promise<any>[] = [];



        if(user && (user.role==="ADMIN" || user.role==="AGENT")){



          // Customers


          staffPromises.push(

            userAPI.listAll({
              role:"CUSTOMER",
              search:query
            })

            .then((data:any)=>{


              if(Array.isArray(data)){


                data.slice(0,5).forEach((item:any)=>{


                  results.push({

                    id:`customer-${item.id}`,

                    title:item.name,

                    subtitle:`Customer • ${item.email}`,

                    category:"Customers",

                    url:"/manage-customers",

                    state:{
                      openCustomerId:item.id
                    }

                  });


                });


              }


            })

            .catch(err=>console.error("Customer search error:",err))

          );





          // Agents


          staffPromises.push(


            userAPI.listAll({
              role:"AGENT",
              search:query
            })


            .then((data:any)=>{


              if(Array.isArray(data)){


                data.slice(0,5).forEach((item:any)=>{


                  results.push({

                    id:`agent-${item.id}`,

                    title:item.name,

                    subtitle:`Agent • ${item.email}`,

                    category:"Agents",

                    url:"/manage-agents",

                    state:{
                      searchAgent:item.name
                    }

                  });


                });


              }


            })


            .catch(err=>console.error("Agent search error:",err))


          );





          // Chat users


          const targetRole =
          user.role==="ADMIN" ? "AGENT" : "ADMIN";



          staffPromises.push(


            userAPI.listAll({

              role:targetRole,

              search:query

            })


            .then((data:any)=>{


              if(Array.isArray(data)){


                data.slice(0,5).forEach((item:any)=>{


                  results.push({

                    id:`chat-${item.id}`,

                    title:item.name,

                    subtitle:
                    `Direct Chat • ${item.role.toLowerCase()}`,

                    category:"Chats",

                    url:"/chat",

                    state:{
                      openParticipantId:item.id
                    }


                  });


                });


              }


            })

            .catch(err=>console.error("Chat search error:",err))


          );

        }




        await Promise.all([
          kbPromise,
          ticketPromise,
          ...staffPromises
        ]);



        setSearchResults(results);



      }catch(err){

        console.error("Global search failed:",err);

      }
      finally{

        setIsSearching(false);

      }


    };



    const delayDebounce=setTimeout(()=>{

      fetchSearchResults();

    },200);



    return ()=>clearTimeout(delayDebounce);



  },[
    searchQuery,
    user?.role,
    user
  ]);
  // ---------------- CLICK OUTSIDE + KEYBOARD ----------------

  useEffect(() => {

    const handleClickOutside = (event: MouseEvent) => {

      if (
        notifRef.current &&
        !notifRef.current.contains(event.target as Node)
      ) {
        setNotifDropdownOpen(false);
      }


      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowSearchDropdown(false);
      }

    };



    const handleKeyDown = (event: KeyboardEvent) => {

      if(event.key === "Escape"){

        setNotifDropdownOpen(false);
        setShowSearchDropdown(false);

      }

    };



    document.addEventListener(
      "mousedown",
      handleClickOutside
    );


    document.addEventListener(
      "keydown",
      handleKeyDown
    );



    return()=>{

      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );


      document.removeEventListener(
        "keydown",
        handleKeyDown
      );


      if(timerRef.current){

        clearTimeout(timerRef.current);

      }

    };


  },[]);





  // CMD + K SEARCH

  useEffect(()=>{


    const handleGlobalKeyDown=(e:KeyboardEvent)=>{


      if((e.metaKey || e.ctrlKey) && e.key==="k"){

        e.preventDefault();


        const input =
        searchRef.current?.querySelector("input");


        if(input){

          (input as HTMLInputElement).focus();

        }

      }


    };


    window.addEventListener(
      "keydown",
      handleGlobalKeyDown
    );


    return()=>{

      window.removeEventListener(
        "keydown",
        handleGlobalKeyDown
      );

    };


  },[]);





  const handleSearchKeyDown = (
    e:React.KeyboardEvent<HTMLInputElement>
  )=>{


    if(e.key==="Enter"){


      if(searchResults.length>0){

        const bestMatch=searchResults[0];


        setShowSearchDropdown(false);

        setSearchQuery("");

        navigate(
          bestMatch.url,
          {
            state:bestMatch.state
          }
        );

      }

    }


  };





  const handleResultClick=(result:any)=>{

    setShowSearchDropdown(false);

    setSearchQuery("");

    navigate(
      result.url,
      {
        state:result.state
      }
    );

  };





  useEffect(()=>{

    if(sidebarOpen){

      setNotifDropdownOpen(false);

    }

  },[sidebarOpen]);





  if(!user){

    return <>{children}</>;

  }





  const handleLogout=()=>{

    logout();

    navigate("/auth");

  };






  const toggleAvailability=async()=>{


    if(user.role==="AGENT" && user.id){


      const nextState=!user.isAvailable;


      try{


        await agentAPI.updateAvailability(
          user.id,
          nextState
        );


        updateUserAvailability(nextState);


      }catch(err){

        console.error(
          "Failed to update availability:",
          err
        );

      }


    }


  };







  // ---------------- NAVIGATION ----------------


  const getNavLinks=()=>{


    switch(user.role){


      case "CUSTOMER":

        return [

          {
            name:"Dashboard",
            path:"/dashboard",
            icon:LayoutDashboard
          },

          {
            name:"Create Ticket",
            path:"/create-ticket",
            icon:PlusCircle
          },

          {
            name:"My Tickets",
            path:"/tickets",
            icon:Ticket
          },

          {
            name:"Knowledge Base",
            path:"/kb",
            icon:BookOpen
          }

        ];



      case "AGENT":

        return [

          {
            name:"Dashboard",
            path:"/dashboard",
            icon:LayoutDashboard
          },

          {
            name:"Internal Chat",
            path:"/chat",
            icon:MessageSquare
          },

          {
            name:"Browse KB",
            path:"/kb",
            icon:BookOpen
          },

          {
            name:"Manage KB",
            path:"/manage-kb",
            icon:BookOpen
          }

        ];




      case "ADMIN":

        return [

          {
            name:"Dashboard",
            path:"/dashboard",
            icon:LayoutDashboard
          },


          {
            name:"Manage Customers",
            path:"/manage-customers",
            icon:Users
          },


          {
            name:"Manage Agents",
            path:"/manage-agents",
            icon:UserCog
          },


          {
            name:"Manage KB",
            path:"/manage-kb",
            icon:BookOpen
          },


          {
            name:"Agent Chat",
            path:"/chat",
            icon:MessageSquare
          }

        ];



      default:

        return [];

    }


  };




  const navLinks=getNavLinks();





  // IMPORTANT:
  // getPageTitle is moved above getPageSubtitle

  const getPageTitle=()=>{


    const active =
    navLinks.find(
      link=>link.path===location.pathname
    );


    if(active){

      return active.name;

    }


    if(location.pathname.startsWith("/tickets/")){

      return "Ticket Details";

    }


    return "Support Portal";


  };





  const getPageSubtitle=()=>{


    switch(getPageTitle()){


      case "Dashboard":

        return "Welcome to your support control center";


      case "Create Ticket":

        return "Submit a new request to our support team";


      case "My Tickets":

        return "Track and manage your existing tickets";


      case "Knowledge Base":

      case "Browse KB":

        return "Find answers in our documentation articles";


      case "Manage KB":

        return "Publish and edit support articles";


      case "Manage Customers":

        return "View and configure registered customer profiles";


      case "Manage Agents":

        return "Configure and manage support agents";


      case "Internal Chat":

      case "Agent Chat":

        return "Discuss active issues with other staff";


      case "Ticket Details":

        return "Detailed look and conversation thread";


      case "Profile":

        return "Manage your account and notification settings";


      default:

        return "Swift Ticket Support Portal";


    }


  };
  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 relative overflow-x-hidden ${
        theme === "light"
          ? "bg-[#F8FAFC] text-[#0F172A]"
          : "bg-[#09111F] text-[#F8FAFC]"
      }`}
    >

      {/* BACKGROUND DECORATIONS */}
      {theme === "dark" && (
        <>
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.12)_0%,transparent_70%)] rounded-full blur-[60px] pointer-events-none -z-10" />

          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(109,93,246,0.12)_0%,transparent_70%)] rounded-full blur-[60px] pointer-events-none -z-10" />
        </>
      )}


      <div className="flex flex-1">


        {/* ================= DESKTOP SIDEBAR ================= */}

        <aside
          className={`hidden md:flex flex-col w-64 border-r backdrop-blur-xl p-6 sticky top-0 h-screen justify-between z-40 transition-colors ${
            theme === "light"
              ? "bg-white border-[#E2E8F0]"
              : "bg-[#121A2B] border-white/5"
          }`}
        >


          <div className="space-y-8">


            {/* LOGO */}

            <Link
              to="/dashboard"
              className="flex items-center space-x-3 cursor-pointer"
            >

              <div className="w-11 h-11 rounded-[14px] bg-gradient-to-tr from-[#5B6CFF] to-[#8B5CF6] flex items-center justify-center shadow-lg">
                <Zap className="w-5 h-5 text-white fill-white" />
              </div>


              <div>

                <h1
                  className={`text-lg font-extrabold ${
                    theme === "light"
                      ? "text-[#0F172A]"
                      : "text-white"
                  }`}
                >
                  Swift Ticket
                </h1>


                <span className="text-[10px] text-[#94A3B8] uppercase tracking-wider">
                  Smart AI Support
                </span>

              </div>


            </Link>





            {/* NAVIGATION */}

            <div className="space-y-3">


              <span className="text-[10px] font-extrabold text-[#64748B] tracking-widest px-4">
                NAVIGATION
              </span>



              <nav className="space-y-1.5">


                {navLinks.map((link)=>{


                  const Icon=link.icon;


                  const active =
                  location.pathname===link.path;



                  return (

                    <Link
                      key={link.path}
                      to={link.path}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                        active
                          ? "bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white"
                          : theme==="light"
                            ? "text-[#64748B] hover:bg-slate-100"
                            : "text-[#94A3B8] hover:bg-white/5"
                      }`}
                    >

                      <Icon className="w-5 h-5"/>

                      <span className="text-[15px] font-medium">
                        {link.name}
                      </span>


                    </Link>

                  );


                })}


              </nav>


            </div>


          </div>






          {/* USER CARD */}

          <div
            className={`space-y-4 pt-6 border-t ${
              theme==="light"
                ? "border-[#E2E8F0]"
                : "border-white/5"
            }`}
          >


            <Link
              to="/profile"
              className={`flex items-center gap-3 p-3 rounded-2xl border ${
                theme==="light"
                  ? "bg-slate-50 border-[#E2E8F0]"
                  : "bg-[#1A2335] border-white/5"
              }`}
            >


              <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center bg-indigo-500/10">

                {user.profilePicture ? (

                  <img
                    src={user.profilePicture}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />

                ) : (

                  <User className="w-4 h-4 text-indigo-400"/>

                )}

              </div>



              <div className="overflow-hidden">

                <p className="text-xs font-semibold truncate">
                  {user.name}
                </p>


                <p className="text-[10px] text-[#94A3B8] capitalize">
                  {user.role.toLowerCase()}
                </p>

              </div>



            </Link>





            <button
              onClick={handleLogout}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-semibold ${
                theme==="light"
                  ? "bg-slate-50 border-[#E2E8F0] hover:text-red-500"
                  : "bg-white/5 border-white/5 hover:text-red-400"
              }`}
            >

              <LogOut className="w-4 h-4"/>

              Logout

            </button>


          </div>



        </aside>





        {/* ================= MOBILE SIDEBAR ================= */}


        <AnimatePresence>


        {sidebarOpen && (

          <>


          <motion.div

            initial={{opacity:0}}

            animate={{opacity:.5}}

            exit={{opacity:0}}

            className="fixed inset-0 bg-black z-40 md:hidden"

            onClick={()=>setSidebarOpen(false)}

          />





          <motion.aside

            initial={{x:"-100%"}}

            animate={{x:0}}

            exit={{x:"-100%"}}

            className={`fixed left-0 top-0 bottom-0 w-64 p-6 z-50 md:hidden ${
              theme==="light"
                ? "bg-white"
                : "bg-[#121A2B]"
            }`}
          >


            <div className="flex justify-between items-center">


              <Link
                to="/dashboard"
                onClick={()=>setSidebarOpen(false)}
                className="flex items-center gap-2"
              >

                <Zap className="text-indigo-500"/>

                <span className="font-bold">
                  Swift Ticket
                </span>

              </Link>



              <button
                onClick={()=>setSidebarOpen(false)}
              >

                <X/>

              </button>


            </div>





            <nav className="mt-8 space-y-2">


              {navLinks.map((link)=>{


                const Icon=link.icon;


                return (

                  <Link

                    key={link.path}

                    to={link.path}

                    onClick={()=>setSidebarOpen(false)}

                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5"

                  >

                    <Icon className="w-5 h-5"/>

                    {link.name}

                  </Link>

                );


              })}


            </nav>



          </motion.aside>


          </>

        )}


        </AnimatePresence>
                {/* ================= MAIN AREA ================= */}

        <div className="flex-1 flex flex-col min-w-0">


          {/* ================= HEADER ================= */}

          <header
            className={`sticky top-0 z-30 h-20 border-b backdrop-blur-md flex items-center justify-between px-6 ${
              theme==="light"
                ? "bg-white/80 border-[#E2E8F0]"
                : "bg-[#0B1220]/80 border-white/5"
            }`}
          >


            {/* LEFT */}

            <div className="flex items-center gap-3">


              <button

                onClick={()=>setSidebarOpen(true)}

                className="md:hidden"

              >

                <Menu className="w-6 h-6"/>

              </button>




              <div className="hidden md:block">


                <h2 className="text-2xl font-bold">

                  {getPageTitle()}

                </h2>


                <p className="text-xs text-[#94A3B8]">

                  {getPageSubtitle()}

                </p>


              </div>


            </div>






            {/* SEARCH */}

            <div
              className="hidden lg:flex flex-1 max-w-md mx-8 relative"
              ref={searchRef}
            >

              <input

                type="text"

                value={searchQuery}

                onChange={(e)=>{

                  setSearchQuery(e.target.value);

                  setShowSearchDropdown(true);

                }}

                onFocus={()=>setShowSearchDropdown(true)}

                onKeyDown={handleSearchKeyDown}

                placeholder="Search tickets, articles..."

                className={`w-full px-4 py-2 rounded-2xl border outline-none ${
                  theme==="light"
                    ? "bg-white border-slate-200"
                    : "bg-[#1A2335] border-white/10 text-white"
                }`}

              />





              <AnimatePresence>


              {
                showSearchDropdown &&
                searchQuery.length>=2 &&

                (

                <motion.div

                  initial={{opacity:0,y:10}}

                  animate={{opacity:1,y:0}}

                  exit={{opacity:0,y:10}}

                  className={`absolute top-full mt-2 w-full rounded-xl border shadow-xl z-50 overflow-hidden ${
                    theme==="light"
                      ? "bg-white"
                      : "bg-[#1A2335]"
                  }`}

                >



                {

                  isSearching ?


                  (

                    <div className="p-5 text-center text-sm">

                      Searching...

                    </div>

                  )

                  :

                  searchResults.length===0 ?


                  (

                    <div className="p-5 text-center text-sm">

                      No results found

                    </div>

                  )

                  :


                  (

                  <div className="p-2">


                  {

                  searchResults.map((result)=>


                    (

                    <button

                      key={result.id}

                      onClick={()=>handleResultClick(result)}

                      className="w-full text-left p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5"

                    >

                      <p className="font-semibold text-sm">

                        {result.title}

                      </p>


                      <p className="text-xs text-gray-400">

                        {result.subtitle}

                      </p>


                    </button>


                    )


                  )

                  }


                  </div>


                  )


                }



                </motion.div>


                )

              }


              </AnimatePresence>


            </div>







            {/* RIGHT SIDE */}

            <div className="flex items-center gap-4">





              {/* AGENT STATUS */}

              {

              user.role==="AGENT" &&

              (

              <div className="hidden sm:flex items-center gap-3">


                <span className="text-xs">

                  {user.isAvailable ? "Online":"Offline"}

                </span>



                <button

                  onClick={toggleAvailability}

                  className={`w-10 h-5 rounded-full ${
                    user.isAvailable
                      ? "bg-green-500"
                      : "bg-gray-500"
                  }`}

                >

                  <div

                    className={`w-4 h-4 bg-white rounded-full transition ${
                      user.isAvailable
                        ? "translate-x-5"
                        : ""
                    }`}

                  />

                </button>


              </div>

              )

              }





              {/* NOTIFICATION */}


              <div
                className="relative"
                ref={notifRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >


                <button

                  onClick={toggleNotifDropdown}

                  className="relative p-2 rounded-xl border"

                >

                  <Bell className="w-5 h-5"/>



                  {

                  unreadCount>0 &&

                  (

                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">

                    {unreadCount}

                  </span>

                  )

                  }


                </button>





                <AnimatePresence>


                {

                notifDropdownOpen &&


                (

                <motion.div

                  initial={{opacity:0,y:-10}}

                  animate={{opacity:1,y:0}}

                  exit={{opacity:0}}

                  className={`absolute right-0 mt-3 w-80 rounded-xl border shadow-xl overflow-hidden ${
                    theme==="light"
                    ?"bg-white"
                    :"bg-[#1A2335]"
                  }`}

                >


                  <div className="p-4 border-b font-bold">

                    Notifications

                  </div>





                  <div className="max-h-64 overflow-y-auto">


                  {

                  notifications.length===0 ?


                  (

                  <p className="p-5 text-center text-sm">

                    No notifications yet

                  </p>

                  )


                  :

                  notifications.map((notif)=>(


                    <div
                      key={notif.id}
                      className="p-4 border-b"
                    >


                      <div className="flex justify-between">


                      <div>


                      <p className="font-semibold text-sm">

                        {notif.title}

                      </p>


                      <p className="text-xs text-gray-400">

                        {notif.message}

                      </p>


                      </div>





                      <div className="flex gap-1">


                      {!notif.isRead &&

                      (

                      <button
                        onClick={()=>markRead(notif.id)}
                      >

                        <Check className="w-4 h-4 text-green-500"/>

                      </button>

                      )

                      }



                      <button

                        onClick={()=>deleteNotification(notif.id)}

                      >

                        <Trash2 className="w-4 h-4 text-red-500"/>

                      </button>



                      </div>


                      </div>


                    </div>


                  ))

                  }



                  </div>


                </motion.div>

                )

                }


                </AnimatePresence>


              </div>





              {/* THEME */}


              <button

                onClick={toggleTheme}

                className="p-2 rounded-xl border"

              >

                {

                theme==="dark"

                ?

                <Sun className="text-yellow-400"/>

                :

                <Moon className="text-indigo-500"/>

                }

              </button>





              {/* PROFILE */}


              <Link

                to="/profile"

                className="p-2 rounded-xl border"

              >

                {user?.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt={user.name}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-indigo-500/10 flex items-center justify-center">
                    <span className="text-[8px] font-bold text-indigo-400 uppercase">
                      {user?.name?.charAt(0) || "U"}
                    </span>
                  </div>
                )}
              </Link>




            </div>


          </header>
                    {/* ================= MAIN CONTENT ================= */}

          <main className="flex-1 overflow-y-auto p-6 relative">


            <AnimatePresence mode="wait">


              <motion.div

                key={location.pathname}

                initial={{
                  opacity:0,
                  y:15
                }}

                animate={{
                  opacity:1,
                  y:0
                }}

                exit={{
                  opacity:0,
                  y:-15
                }}

                transition={{
                  duration:0.25,
                  ease:"easeOut"
                }}

                className="max-w-7xl mx-auto h-full"

              >


                {children}


              </motion.div>


            </AnimatePresence>


          </main>



        </div>


      </div>


    </div>

  );


};


export default Layout;