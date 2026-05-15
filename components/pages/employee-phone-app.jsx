"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiUrl } from "@/lib/api-client";

const tabs = [
  { id: "calendar", label: "Calendar", icon: "CAL" },
  { id: "leave", label: "Leave", icon: "LV" },
  { id: "home", label: "Home", icon: "HM" },
  { id: "payslips", label: "Payslips", icon: "PAY" },
  { id: "notifications", label: "Notifications", icon: "NTF" }
];

const dayStatus = {
  1: "present", 2: "present", 3: "present", 4: "half", 5: "absent",
  6: "present", 7: "late", 8: "late", 9: "late", 10: "late",
  11: "half", 12: "absent", 13: "late", 14: "late", 15: "late", 16: "late",
  17: "late", 18: "half", 19: "absent", 20: "late", 21: "late", 22: "late",
  23: "late", 24: "late", 25: "half late", 26: "absent", 27: "present",
  28: "late", 29: "present", 30: "present"
};

const shiftAssignmentsStorageKey = "talme-employee-shift-assignments";
const employeeSessionStorageKey = "talme-employee-app-employee-id";

const defaultShiftAssignment = {
  shiftName: "General",
  start: "09:00",
  end: "18:00",
  breakMinutes: "60",
  weekOff: "Sunday",
  status: "Assigned"
};

const loanProfile = {
  hasLoan: true,
  loanId: "LN1023",
  type: "Salary Advance",
  loanDate: "01 Jan 2026",
  totalAmount: 50000,
  remainingBalance: 20000,
  monthlyEmi: 2500,
  nextDeduction: "30 Apr 2026",
  interest: "0%",
  arrearsAmount: 5000,
  arrearsReason: "Salary Revision",
  arrearsStatus: "Pending",
  emiHistory: [
    { month: "Jan 2026", amount: 2500, status: "Paid" },
    { month: "Feb 2026", amount: 2500, status: "Paid" },
    { month: "Mar 2026", amount: 2500, status: "Pending" },
    { month: "Apr 2026", amount: 2500, status: "Scheduled" }
  ]
};

const appLanguages = [
  { id: "en", nativeName: "English", englishName: "English" },
  { id: "hi", nativeName: "हिन्दी", englishName: "Hindi" },
  { id: "gu", nativeName: "ગુજરાતી", englishName: "Gujarati" },
  { id: "mr", nativeName: "मराठी", englishName: "Marathi" },
  { id: "kn", nativeName: "ಕನ್ನಡ", englishName: "Kannada" },
  { id: "te", nativeName: "తెలుగు", englishName: "Telugu" },
  { id: "ta", nativeName: "தமிழ்", englishName: "Tamil" },
  { id: "ml", nativeName: "മലയാളം", englishName: "Malayalam" },
  { id: "bn", nativeName: "বাংলা", englishName: "Bengali" },
  { id: "or", nativeName: "ଓଡ଼ିଆ", englishName: "Odia" }
];

const translations = {
  en: {
    welcome: "Welcome", home: "Home", calendar: "Calendar", leave: "Leave", payslips: "Payslips", notifications: "Notifications",
    workingHours: "Working Hours", hour: "Hour", min: "Min", sec: "Sec", totalBreak: "Total Break Time", firstShift: "First shift timing is 08:00 am - 05:30 pm",
    todaysActivity: "Today's activity", swipePunch: "Swipe To Punch", swipePunchOut: "Swipe To Punch Out", punchIn: "Punch In", punchOut: "Punch Out",
    appLanguage: "App Language", selectLanguage: "Select your preferable language", apply: "Apply", languageApplied: "Language updated successfully.",
    myDocuments: "My Documents", loanArrears: "Loan & Arrears", benefits: "Employee Benefits", logout: "Logout", requestLoan: "Request Loan",
    viewStatement: "View Statement", raiseQuery: "Raise Query", downloadSummary: "Download Summary", loanSummary: "Loan Summary", loanDetails: "Loan Details",
    emiHistory: "EMI History", arrears: "Arrears", noLoans: "No Loans Yet", noLoansText: "You haven't taken any loans or arrears. You can request a salary advance anytime.",
    pendingRegularization: "Pending Regularization", uploadDocument: "Upload Document", downloadPayslip: "Download Payslip"
  },
  hi: {
    welcome: "स्वागत है", home: "होम", calendar: "कैलेंडर", leave: "छुट्टी", payslips: "पेस्लिप", notifications: "सूचनाएं",
    workingHours: "कार्य घंटे", hour: "घंटा", min: "मिनट", sec: "सेकंड", totalBreak: "कुल ब्रेक समय", firstShift: "पहली शिफ्ट का समय 08:00 am - 05:30 pm है",
    todaysActivity: "आज की गतिविधि", swipePunch: "पंच करने के लिए स्वाइप करें", swipePunchOut: "पंच आउट के लिए स्वाइप करें", punchIn: "पंच इन", punchOut: "पंच आउट",
    appLanguage: "ऐप भाषा", selectLanguage: "अपनी पसंदीदा भाषा चुनें", apply: "लागू करें", languageApplied: "भाषा सफलतापूर्वक अपडेट हुई।",
    myDocuments: "मेरे दस्तावेज़", loanArrears: "लोन और बकाया", benefits: "कर्मचारी लाभ", logout: "लॉगआउट", requestLoan: "लोन अनुरोध",
    viewStatement: "स्टेटमेंट देखें", raiseQuery: "प्रश्न उठाएं", downloadSummary: "सारांश डाउनलोड", loanSummary: "लोन सारांश", loanDetails: "लोन विवरण",
    emiHistory: "EMI इतिहास", arrears: "बकाया", noLoans: "अभी कोई लोन नहीं", noLoansText: "आपने कोई लोन या बकाया नहीं लिया है। आप कभी भी सैलरी एडवांस मांग सकते हैं।",
    pendingRegularization: "लंबित नियमितीकरण", uploadDocument: "दस्तावेज़ अपलोड करें", downloadPayslip: "पेस्लिप डाउनलोड करें"
  },
  gu: {
    welcome: "સ્વાગત છે", home: "હોમ", calendar: "કેલેન્ડર", leave: "રજા", payslips: "પેસ્લિપ", notifications: "સૂચનાઓ",
    workingHours: "કામના કલાકો", hour: "કલાક", min: "મિનિટ", sec: "સેકન્ડ", totalBreak: "કુલ બ્રેક સમય", firstShift: "પ્રથમ શિફ્ટનો સમય 08:00 am - 05:30 pm છે",
    todaysActivity: "આજની પ્રવૃત્તિ", swipePunch: "પંચ કરવા સ્વાઇપ કરો", swipePunchOut: "પંચ આઉટ કરવા સ્વાઇપ કરો", punchIn: "પંચ ઇન", punchOut: "પંચ આઉટ",
    appLanguage: "એપ ભાષા", selectLanguage: "તમારી પસંદગીની ભાષા પસંદ કરો", apply: "લાગુ કરો", languageApplied: "ભાષા અપડેટ થઈ.",
    myDocuments: "મારા દસ્તાવેજો", loanArrears: "લોન અને બાકી", benefits: "કર્મચારી લાભ", logout: "લોગઆઉટ", requestLoan: "લોન વિનંતી",
    viewStatement: "સ્ટેટમેન્ટ જુઓ", raiseQuery: "પ્રશ્ન ઉઠાવો", downloadSummary: "સારાંશ ડાઉનલોડ", loanSummary: "લોન સારાંશ", loanDetails: "લોન વિગતો",
    emiHistory: "EMI ઇતિહાસ", arrears: "બાકી", noLoans: "હજુ કોઈ લોન નથી", noLoansText: "તમે કોઈ લોન અથવા બાકી લીધું નથી. તમે ક્યારે પણ સેલેરી એડવાન્સ માગી શકો છો.",
    pendingRegularization: "બાકી નિયમિતીકરણ", uploadDocument: "દસ્તાવેજ અપલોડ કરો", downloadPayslip: "પેસ્લિપ ડાઉનલોડ કરો"
  },
  mr: {
    welcome: "स्वागत आहे", home: "होम", calendar: "कॅलेंडर", leave: "रजा", payslips: "पेस्लिप", notifications: "सूचना",
    workingHours: "कामाचे तास", hour: "तास", min: "मिनिट", sec: "सेकंद", totalBreak: "एकूण ब्रेक वेळ", firstShift: "पहिल्या शिफ्टची वेळ 08:00 am - 05:30 pm आहे",
    todaysActivity: "आजची क्रिया", swipePunch: "पंच करण्यासाठी स्वाइप करा", swipePunchOut: "पंच आउटसाठी स्वाइप करा", punchIn: "पंच इन", punchOut: "पंच आउट",
    appLanguage: "अ‍ॅप भाषा", selectLanguage: "आपली पसंतीची भाषा निवडा", apply: "लागू करा", languageApplied: "भाषा अपडेट झाली.",
    myDocuments: "माझे दस्तऐवज", loanArrears: "कर्ज आणि थकबाकी", benefits: "कर्मचारी लाभ", logout: "लॉगआउट", requestLoan: "कर्ज विनंती",
    viewStatement: "स्टेटमेंट पहा", raiseQuery: "प्रश्न विचारा", downloadSummary: "सारांश डाउनलोड", loanSummary: "कर्ज सारांश", loanDetails: "कर्ज तपशील",
    emiHistory: "EMI इतिहास", arrears: "थकबाकी", noLoans: "अजून कर्ज नाही", noLoansText: "आपण कोणतेही कर्ज किंवा थकबाकी घेतलेली नाही. आपण कधीही पगार आगाऊ मागू शकता.",
    pendingRegularization: "प्रलंबित नियमितीकरण", uploadDocument: "दस्तऐवज अपलोड करा", downloadPayslip: "पेस्लिप डाउनलोड करा"
  },
  kn: {
    welcome: "ಸ್ವಾಗತ", home: "ಹೋಮ್", calendar: "ಕ್ಯಾಲೆಂಡರ್", leave: "ರಜೆ", payslips: "ಪೇಸ್ಲಿಪ್", notifications: "ಅಧಿಸೂಚನೆಗಳು",
    workingHours: "ಕೆಲಸದ ಗಂಟೆಗಳು", hour: "ಗಂಟೆ", min: "ನಿಮಿಷ", sec: "ಸೆಕೆಂಡ್", totalBreak: "ಒಟ್ಟು ವಿರಾಮ ಸಮಯ", firstShift: "ಮೊದಲ ಶಿಫ್ಟ್ ಸಮಯ 08:00 am - 05:30 pm",
    todaysActivity: "ಇಂದಿನ ಚಟುವಟಿಕೆ", swipePunch: "ಪಂಚ್ ಮಾಡಲು ಸ್ವೈಪ್ ಮಾಡಿ", swipePunchOut: "ಪಂಚ್ ಔಟ್ ಮಾಡಲು ಸ್ವೈಪ್ ಮಾಡಿ", punchIn: "ಪಂಚ್ ಇನ್", punchOut: "ಪಂಚ್ ಔಟ್",
    appLanguage: "ಆಪ್ ಭಾಷೆ", selectLanguage: "ನಿಮ್ಮ ಮೆಚ್ಚಿನ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ", apply: "ಅನ್ವಯಿಸಿ", languageApplied: "ಭಾಷೆ ನವೀಕರಿಸಲಾಗಿದೆ.",
    myDocuments: "ನನ್ನ ದಾಖಲೆಗಳು", loanArrears: "ಸಾಲ ಮತ್ತು ಬಾಕಿ", benefits: "ನೌಕರರ ಲಾಭಗಳು", logout: "ಲಾಗ್ ಔಟ್", requestLoan: "ಸಾಲ ವಿನಂತಿಸಿ",
    viewStatement: "ಸ್ಟೇಟ್ಮೆಂಟ್ ನೋಡಿ", raiseQuery: "ಪ್ರಶ್ನೆ ಎತ್ತಿ", downloadSummary: "ಸಾರಾಂಶ ಡೌನ್‌ಲೋಡ್", loanSummary: "ಸಾಲ ಸಾರಾಂಶ", loanDetails: "ಸಾಲ ವಿವರಗಳು",
    emiHistory: "EMI ಇತಿಹಾಸ", arrears: "ಬಾಕಿ", noLoans: "ಇನ್ನೂ ಸಾಲಗಳಿಲ್ಲ", noLoansText: "ನೀವು ಸಾಲ ಅಥವಾ ಬಾಕಿ ತೆಗೆದುಕೊಂಡಿಲ್ಲ. ಯಾವಾಗ ಬೇಕಾದರೂ ವೇತನ ಮುಂಗಡವನ್ನು ವಿನಂತಿಸಬಹುದು.",
    pendingRegularization: "ಬಾಕಿ ನಿಯಮಿತಗೊಳಿಸುವಿಕೆ", uploadDocument: "ದಾಖಲೆ ಅಪ್ಲೋಡ್", downloadPayslip: "ಪೇಸ್ಲಿಪ್ ಡೌನ್‌ಲೋಡ್"
  },
  te: {
    welcome: "స్వాగతం", home: "హోమ్", calendar: "క్యాలెండర్", leave: "సెలవు", payslips: "పేస్లిప్స్", notifications: "నోటిఫికేషన్లు",
    workingHours: "పని గంటలు", hour: "గంట", min: "నిమి", sec: "సెక", totalBreak: "మొత్తం విరామ సమయం", firstShift: "మొదటి షిఫ్ట్ సమయం 08:00 am - 05:30 pm",
    todaysActivity: "ఈరోజు కార్యకలాపం", swipePunch: "పంచ్ చేయడానికి స్వైప్ చేయండి", swipePunchOut: "పంచ్ అవుట్‌కు స్వైప్ చేయండి", punchIn: "పంచ్ ఇన్", punchOut: "పంచ్ అవుట్",
    appLanguage: "యాప్ భాష", selectLanguage: "మీకు ఇష్టమైన భాషను ఎంచుకోండి", apply: "అప్లై", languageApplied: "భాష నవీకరించబడింది.",
    myDocuments: "నా పత్రాలు", loanArrears: "లోన్ & బకాయిలు", benefits: "ఉద్యోగి ప్రయోజనాలు", logout: "లాగ్ అవుట్", requestLoan: "లోన్ అభ్యర్థించండి",
    viewStatement: "స్టేట్‌మెంట్ చూడండి", raiseQuery: "ప్రశ్న అడగండి", downloadSummary: "సారాంశం డౌన్‌లోడ్", loanSummary: "లోన్ సారాంశం", loanDetails: "లోన్ వివరాలు",
    emiHistory: "EMI చరిత్ర", arrears: "బకాయిలు", noLoans: "ఇంకా లోన్లు లేవు", noLoansText: "మీరు ఎలాంటి లోన్లు లేదా బకాయిలు తీసుకోలేదు. ఎప్పుడైనా జీతం అడ్వాన్స్ కోరవచ్చు.",
    pendingRegularization: "పెండింగ్ రెగ్యులరైజేషన్", uploadDocument: "పత్రం అప్లోడ్", downloadPayslip: "పేస్లిప్ డౌన్‌లోడ్"
  },
  ta: {
    welcome: "வரவேற்பு", home: "முகப்பு", calendar: "காலண்டர்", leave: "விடுப்பு", payslips: "ஊதிய சீட்டு", notifications: "அறிவிப்புகள்",
    workingHours: "வேலை நேரம்", hour: "மணி", min: "நிமிடம்", sec: "விநாடி", totalBreak: "மொத்த இடைவேளை நேரம்", firstShift: "முதல் ஷிப்ட் நேரம் 08:00 am - 05:30 pm",
    todaysActivity: "இன்றைய செயல்பாடு", swipePunch: "பஞ்ச் செய்ய ஸ்வைப் செய்யவும்", swipePunchOut: "பஞ்ச் அவுட் செய்ய ஸ்வைப் செய்யவும்", punchIn: "பஞ்ச் இன்", punchOut: "பஞ்ச் அவுட்",
    appLanguage: "ஆப் மொழி", selectLanguage: "உங்களுக்கு விருப்பமான மொழியைத் தேர்வு செய்யவும்", apply: "பயன்படுத்து", languageApplied: "மொழி புதுப்பிக்கப்பட்டது.",
    myDocuments: "என் ஆவணங்கள்", loanArrears: "கடன் & நிலுவை", benefits: "பணியாளர் நலன்கள்", logout: "வெளியேறு", requestLoan: "கடன் கோரிக்கை",
    viewStatement: "அறிக்கை காண்க", raiseQuery: "கேள்வி எழுப்பு", downloadSummary: "சுருக்கம் பதிவிறக்கு", loanSummary: "கடன் சுருக்கம்", loanDetails: "கடன் விவரங்கள்",
    emiHistory: "EMI வரலாறு", arrears: "நிலுவை", noLoans: "இன்னும் கடன்கள் இல்லை", noLoansText: "நீங்கள் எந்த கடனும் அல்லது நிலுவையும் எடுக்கவில்லை. எப்போது வேண்டுமானாலும் சம்பள முன்பணம் கோரலாம்.",
    pendingRegularization: "நிலுவை முறைப்படுத்தல்", uploadDocument: "ஆவணம் பதிவேற்று", downloadPayslip: "ஊதிய சீட்டு பதிவிறக்கு"
  },
  ml: {
    welcome: "സ്വാഗതം", home: "ഹോം", calendar: "കലണ്ടർ", leave: "അവധി", payslips: "പേസ്ലിപ്പ്", notifications: "അറിയിപ്പുകൾ",
    workingHours: "പ്രവർത്തി സമയം", hour: "മണിക്കൂർ", min: "മിനിറ്റ്", sec: "സെക്കൻഡ്", totalBreak: "ആകെ ഇടവേള സമയം", firstShift: "ആദ്യ ഷിഫ്റ്റ് സമയം 08:00 am - 05:30 pm",
    todaysActivity: "ഇന്നത്തെ പ്രവർത്തനം", swipePunch: "പഞ്ച് ചെയ്യാൻ സ്വൈപ്പ് ചെയ്യുക", swipePunchOut: "പഞ്ച് ഔട്ട് ചെയ്യാൻ സ്വൈപ്പ് ചെയ്യുക", punchIn: "പഞ്ച് ഇൻ", punchOut: "പഞ്ച് ഔട്ട്",
    appLanguage: "ആപ്പ് ഭാഷ", selectLanguage: "നിങ്ങൾക്ക് ഇഷ്ടമുള്ള ഭാഷ തിരഞ്ഞെടുക്കുക", apply: "പ്രയോഗിക്കുക", languageApplied: "ഭാഷ അപ്ഡേറ്റ് ചെയ്തു.",
    myDocuments: "എന്റെ രേഖകൾ", loanArrears: "വായ്പ & കുടിശ്ശിക", benefits: "ജീവനക്കാരുടെ ആനുകൂല്യങ്ങൾ", logout: "ലോഗ് ഔട്ട്", requestLoan: "വായ്പ അഭ്യർത്ഥിക്കുക",
    viewStatement: "സ്റ്റേറ്റ്മെന്റ് കാണുക", raiseQuery: "ചോദ്യം ഉയർത്തുക", downloadSummary: "സാരാംശം ഡൗൺലോഡ്", loanSummary: "വായ്പ സാരാംശം", loanDetails: "വായ്പ വിശദാംശങ്ങൾ",
    emiHistory: "EMI ചരിത്രം", arrears: "കുടിശ്ശിക", noLoans: "ഇനിയും വായ്പകളില്ല", noLoansText: "നിങ്ങൾ വായ്പകളോ കുടിശ്ശികയോ എടുത്തിട്ടില്ല. എപ്പോൾ വേണമെങ്കിലും ശമ്പള അഡ്വാൻസ് അഭ്യർത്ഥിക്കാം.",
    pendingRegularization: "പെൻഡിംഗ് റെഗുലറൈസേഷൻ", uploadDocument: "രേഖ അപ്‌ലോഡ്", downloadPayslip: "പേസ്ലിപ്പ് ഡൗൺലോഡ്"
  },
  bn: {
    welcome: "স্বাগতম", home: "হোম", calendar: "ক্যালেন্ডার", leave: "ছুটি", payslips: "পেস্লিপ", notifications: "বিজ্ঞপ্তি",
    workingHours: "কাজের সময়", hour: "ঘন্টা", min: "মিনিট", sec: "সেকেন্ড", totalBreak: "মোট বিরতির সময়", firstShift: "প্রথম শিফটের সময় 08:00 am - 05:30 pm",
    todaysActivity: "আজকের কার্যকলাপ", swipePunch: "পাঞ্চ করতে সোয়াইপ করুন", swipePunchOut: "পাঞ্চ আউট করতে সোয়াইপ করুন", punchIn: "পাঞ্চ ইন", punchOut: "পাঞ্চ আউট",
    appLanguage: "অ্যাপ ভাষা", selectLanguage: "আপনার পছন্দের ভাষা নির্বাচন করুন", apply: "প্রয়োগ করুন", languageApplied: "ভাষা আপডেট হয়েছে।",
    myDocuments: "আমার নথি", loanArrears: "ঋণ ও বকেয়া", benefits: "কর্মচারী সুবিধা", logout: "লগআউট", requestLoan: "ঋণের অনুরোধ",
    viewStatement: "স্টেটমেন্ট দেখুন", raiseQuery: "প্রশ্ন তুলুন", downloadSummary: "সারাংশ ডাউনলোড", loanSummary: "ঋণ সারাংশ", loanDetails: "ঋণ বিবরণ",
    emiHistory: "EMI ইতিহাস", arrears: "বকেয়া", noLoans: "এখনও কোনো ঋণ নেই", noLoansText: "আপনি কোনো ঋণ বা বকেয়া নেননি। আপনি যেকোনো সময় বেতন অগ্রিম চাইতে পারেন।",
    pendingRegularization: "পেন্ডিং নিয়মিতকরণ", uploadDocument: "নথি আপলোড", downloadPayslip: "পেস্লিপ ডাউনলোড"
  },
  or: {
    welcome: "ସ୍ୱାଗତ", home: "ହୋମ୍", calendar: "କ୍ୟାଲେଣ୍ଡର", leave: "ଛୁଟି", payslips: "ପେସ୍ଲିପ୍", notifications: "ସୂଚନା",
    workingHours: "କାମ ସମୟ", hour: "ଘଣ୍ଟା", min: "ମିନିଟ୍", sec: "ସେକେଣ୍ଡ", totalBreak: "ମୋଟ ବିରତି ସମୟ", firstShift: "ପ୍ରଥମ ଶିଫ୍ଟ ସମୟ 08:00 am - 05:30 pm",
    todaysActivity: "ଆଜିର କାର୍ଯ୍ୟକଳାପ", swipePunch: "ପଞ୍ଚ କରିବାକୁ ସ୍ୱାଇପ୍ କରନ୍ତୁ", swipePunchOut: "ପଞ୍ଚ ଆଉଟ୍ ପାଇଁ ସ୍ୱାଇପ୍ କରନ୍ତୁ", punchIn: "ପଞ୍ଚ ଇନ୍", punchOut: "ପଞ୍ଚ ଆଉଟ୍",
    appLanguage: "ଆପ୍ ଭାଷା", selectLanguage: "ଆପଣଙ୍କ ପସନ୍ଦର ଭାଷା ବାଛନ୍ତୁ", apply: "ଲାଗୁ କରନ୍ତୁ", languageApplied: "ଭାଷା ଅପଡେଟ୍ ହେଲା।",
    myDocuments: "ମୋ ଡକ୍ୟୁମେଣ୍ଟ", loanArrears: "ଲୋନ୍ ଓ ବକେୟା", benefits: "କର୍ମଚାରୀ ସୁବିଧା", logout: "ଲଗଆଉଟ୍", requestLoan: "ଲୋନ୍ ଅନୁରୋଧ",
    viewStatement: "ଷ୍ଟେଟମେଣ୍ଟ ଦେଖନ୍ତୁ", raiseQuery: "ପ୍ରଶ୍ନ ଉଠାନ୍ତୁ", downloadSummary: "ସାରାଂଶ ଡାଉନଲୋଡ୍", loanSummary: "ଲୋନ୍ ସାରାଂଶ", loanDetails: "ଲୋନ୍ ବିବରଣୀ",
    emiHistory: "EMI ଇତିହାସ", arrears: "ବକେୟା", noLoans: "ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ଲୋନ୍ ନାହିଁ", noLoansText: "ଆପଣ କୌଣସି ଲୋନ୍ କିମ୍ବା ବକେୟା ନେଇନାହାନ୍ତି। ଯେକେବେଳେ ଚାହିଁଲେ ସାଲାରି ଆଡଭାନ୍ସ ଅନୁରୋଧ କରିପାରିବେ।",
    pendingRegularization: "ବକେୟା ନିୟମିତକରଣ", uploadDocument: "ଡକ୍ୟୁମେଣ୍ଟ ଅପଲୋଡ୍", downloadPayslip: "ପେସ୍ଲିପ୍ ଡାଉନଲୋଡ୍"
  }
};

function buildCalendarDays(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1)
  ];
}

function formatMonthTitle(date) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric"
  }).format(date);
}

function getCalendarStatus(monthDate, day, today, records = []) {
  if (!day) return "";

  const activityState = getActivityState(records);

  if (activityState.hasError) return "error";
  if (activityState.isComplete) return "present";

  const isToday =
    monthDate.getFullYear() === today.getFullYear() &&
    monthDate.getMonth() === today.getMonth() &&
    day === today.getDate();

  if (isToday) return "ongoing";

  const isApril2026 = monthDate.getFullYear() === 2026 && monthDate.getMonth() === 3;

  return isApril2026 ? dayStatus[day] || "weekoff" : "weekoff";
}

function nowTime() {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }).format(new Date()).toLowerCase();
}

function formatDisplayDate(date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

function formatStorageDate(date) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function getMonthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function parseMonthStart(value, fallback = new Date(2026, 3, 1)) {
  const normalized = String(value || "");
  const monthInputMatch = normalized.match(/^(\d{4})-(\d{2})/);

  if (monthInputMatch) {
    return new Date(Number(monthInputMatch[1]), Number(monthInputMatch[2]) - 1, 1);
  }

  const parsed = new Date(`1 ${normalized}`);

  if (Number.isNaN(parsed.getTime())) {
    return fallback ? getMonthStart(fallback) : null;
  }

  return getMonthStart(parsed);
}

function normalizeShiftAssignments(rows = []) {
  return rows.reduce((assignments, row) => {
    if (!row?.employeeId) {
      return assignments;
    }

    assignments[row.employeeId] = row;
    return assignments;
  }, {});
}

function readShiftAssignments(serverAssignments = []) {
  try {
    return {
      ...JSON.parse(window.localStorage.getItem(shiftAssignmentsStorageKey) || "{}"),
      ...normalizeShiftAssignments(serverAssignments)
    };
  } catch {
    return normalizeShiftAssignments(serverAssignments);
  }
}

function employeeShiftKey(employee) {
  return employee?.employeeId || employee?.id || "";
}

function getEmployeeShiftAssignment(employee, assignments = {}) {
  const key = employeeShiftKey(employee);

  return assignments[key] || defaultShiftAssignment;
}

function formatShiftTime(value) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    return "--:--";
  }

  const hour = Number(match[1]);
  const minute = match[2];
  const period = hour >= 12 ? "pm" : "am";
  const displayHour = hour % 12 || 12;

  return `${String(displayHour).padStart(2, "0")}:${minute} ${period}`;
}

function formatShiftTiming(assignment) {
  const shiftName = assignment?.shiftName || "General";
  const start = formatShiftTime(assignment?.start);
  const end = formatShiftTime(assignment?.end);

  return `${shiftName} shift timing is ${start} - ${end}`;
}

function getMonthIndex(date) {
  return date.getFullYear() * 12 + date.getMonth();
}

function parseSalaryAmount(value) {
  const matches = String(value || "").replace(/,/g, "").match(/\d+(?:\.\d+)?/g);

  return matches ? Number(matches[matches.length - 1]) || 0 : 0;
}

function getDateFromCalendarDay(monthDate, day) {
  return new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
}

function getActivityStorageKey(employeeId, date) {
  return `talme-employee-phone-activity-${employeeId}-${formatStorageDate(date)}`;
}

function getActivityState(records = []) {
  const hasPunchIn = records.some((entry) => entry.type === "Punch In");
  const hasPunchOut = records.some((entry) => entry.type === "Punch Out");

  return {
    hasPunchIn,
    hasPunchOut,
    hasError: hasPunchIn && !hasPunchOut,
    isComplete: hasPunchIn && hasPunchOut
  };
}

function sortActivity(records = []) {
  return [...records].sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
}

function formatClockParts(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0"));
}

function formatBreakTime(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  return `${String(hours).padStart(2, "0")}h:${String(minutes).padStart(2, "0")}m`;
}

function formatRegularizationDate(date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function calculateActivityBreakSeconds(records) {
  const sorted = sortActivity(records);
  let breakSeconds = 0;

  sorted.forEach((entry, index) => {
    const nextEntry = sorted[index + 1];

    if (entry.type !== "Punch Out" || nextEntry?.type !== "Punch In") {
      return;
    }

    const breakStart = new Date(entry.timestamp);
    const breakEnd = new Date(nextEntry.timestamp);

    breakSeconds += Math.max(0, Math.floor((breakEnd.getTime() - breakStart.getTime()) / 1000));
  });

  return breakSeconds;
}

function calculateActivitySeconds(records, selectedDate, today) {
  const sorted = sortActivity(records);
  let activePunchIn = null;
  let workSeconds = 0;
  const isToday = formatStorageDate(selectedDate) === formatStorageDate(today);

  sorted.forEach((entry) => {
    if (entry.type === "Punch In") {
      activePunchIn = new Date(entry.timestamp);
      return;
    }

    if (entry.type === "Punch Out" && activePunchIn) {
      const punchOut = new Date(entry.timestamp);
      workSeconds += Math.max(0, Math.floor((punchOut.getTime() - activePunchIn.getTime()) / 1000));
      activePunchIn = null;
    }
  });

  if (activePunchIn && isToday) {
    workSeconds += Math.max(0, Math.floor((today.getTime() - activePunchIn.getTime()) / 1000));
  }

  if (!workSeconds && !activePunchIn) {
    return null;
  }

  return workSeconds;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
    style: "currency",
    currency: "INR"
  }).format(amount);
}

function translate(language, key) {
  return translations[language]?.[key] || translations.en[key] || key;
}

function EmptyState({ compact = false }) {
  return (
    <div className={`phone-empty ${compact ? "compact" : ""}`}>
      <div className="phone-empty-art">
        <div className="empty-face" />
        <div className="empty-glass">?</div>
        <div className="empty-board">x</div>
      </div>
      <p>Oops! We couldn't find anything to show</p>
    </div>
  );
}

function StatLine({ label, value }) {
  return (
    <div className="phone-stat-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function normalizeEmployeeId(value) {
  return String(value || "").trim().toLowerCase();
}

function buildEmployeeFromPayslip(record) {
  if (!record?.employeeId) {
    return null;
  }

  const monthlyCtc = Number(record.monthlyCtc) || 0;

  return {
    id: record.employeeId,
    employeeId: record.employeeId,
    email: record.email || "",
    name: record.name || record.employee || record.employeeId,
    department: record.department || "General",
    location: record.location || "Head Office",
    manager: record.manager || "Not Assigned",
    grade: record.designation || record.grade || "Employee",
    joiningDate: record.joiningDate || "",
    salaryBand: monthlyCtc ? `Monthly - INR ${monthlyCtc}` : record.salaryBand || "Monthly - INR 0",
    salaryNetPay: Number(record.monthlyNetPay) || Number(record.salaryNetPay) || 0,
    bankStatus: record.bankName || "Pending",
    status: "Active",
    tone: "gold",
    employeeDetails: {
      employeeCode: record.employeeId,
      employeeName: record.name || record.employee || record.employeeId,
      email: record.email || "",
      department: record.department || "General",
      designation: record.designation || record.grade || "Employee",
      dateOfJoining: record.joiningDate || "",
      salaryNetPay: Number(record.monthlyNetPay) || Number(record.salaryNetPay) || 0,
      bankName: record.bankName || "",
      accountNo: record.bankAccountNumber || record.accountNo || ""
    }
  };
}

function buildEmployeeRoster(employees = [], payslips = []) {
  const roster = new Map();

  payslips.map(buildEmployeeFromPayslip).filter(Boolean).forEach((employee) => {
    roster.set(normalizeEmployeeId(employee.employeeId), employee);
  });

  employees.forEach((employee) => {
    const key = normalizeEmployeeId(employee.employeeId || employee.id);

    if (key) {
      roster.set(key, employee);
    }
  });

  return Array.from(roster.values());
}

export default function EmployeePhoneApp({ data, employeeId: sessionEmployeeId }) {
  const router = useRouter();
  const [activeSessionEmployeeId, setActiveSessionEmployeeId] = useState(sessionEmployeeId || "");
  const normalizedSessionEmployeeId = normalizeEmployeeId(activeSessionEmployeeId);
  const employeeRoster = buildEmployeeRoster(data.employees, data.payslips);
  const matchedEmployee = employeeRoster.find((item) => normalizeEmployeeId(item.employeeId) === normalizedSessionEmployeeId);
  const employee = normalizedSessionEmployeeId ? matchedEmployee || {} : employeeRoster[0] || {};
  const attendance = data.attendanceRecords.find((record) => record.employee === employee.name) || {};
  const [activeTab, setActiveTab] = useState("home");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activity, setActivity] = useState([]);
  const [workSession, setWorkSession] = useState(null);
  const [currentTime, setCurrentTime] = useState(null);
  const [visibleMonth, setVisibleMonth] = useState(() => getMonthStart());
  const [payslipMonth, setPayslipMonth] = useState(() => getMonthStart());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);
  const [calendarActivityByDate, setCalendarActivityByDate] = useState({});
  const [leaveTab, setLeaveTab] = useState("pending");
  const [leaveForm, setLeaveForm] = useState(() => ({
    leaveType: "Casual Leave",
    from: formatStorageDate(new Date()),
    to: formatStorageDate(new Date()),
    reason: ""
  }));
  const [leaveRequests, setLeaveRequests] = useState(data.leaveRequests.filter((leave) => leave.employee === employee.name));
  const [documents, setDocuments] = useState(data.documents.filter((document) => document.owner === employee.name));
  const [uploading, setUploading] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [loanMessage, setLoanMessage] = useState("");
  const [language, setLanguage] = useState("en");
  const [draftLanguage, setDraftLanguage] = useState("en");
  const [languageMessage, setLanguageMessage] = useState("");
  const [shiftAssignments, setShiftAssignments] = useState(() => normalizeShiftAssignments(data.shiftAssignments || []));
  const swipeStartX = useRef(0);
  const swipeMaxOffset = useRef(0);
  const employeeName = employee.name || "Employee";
  const employeeId = employee.employeeId || activeSessionEmployeeId || "TLM-0001";
  const salaryBand = employee.salaryBand || "INR 0";
  const today = currentTime || new Date();
  const currentPayslipMonth = getMonthStart(today);
  const joiningMonth = parseMonthStart(employee.joiningDate, null);
  const earliestPayslipMonth = joiningMonth || currentPayslipMonth;
  const payslipMonthIndex = getMonthIndex(payslipMonth);
  const earliestPayslipMonthIndex = getMonthIndex(earliestPayslipMonth);
  const currentPayslipMonthIndex = getMonthIndex(currentPayslipMonth);
  const canMovePayslipPrevious = payslipMonthIndex > earliestPayslipMonthIndex;
  const canMovePayslipNext = payslipMonthIndex < currentPayslipMonthIndex;
  const employeeAttendanceRecords = data.attendanceRecords.filter((record) =>
    [employee.name, employee.employeeId].includes(record.employee)
  );
  const sharedPayslips = (data.payslips || []).filter((record) =>
    record.status === "Shared" &&
    [employee.name, employee.employeeId].includes(record.employee || record.name || record.employeeId)
  ).sort((a, b) => String(b.monthKey || "").localeCompare(String(a.monthKey || "")));
  const payslipMonthKey = getMonthInputValue(payslipMonth);
  const payslipMonthTitle = formatMonthTitle(payslipMonth);
  const sharedPayslip = sharedPayslips.find((record) => record.monthKey === payslipMonthKey);
  const payslipIsInEmploymentWindow =
    payslipMonthIndex >= earliestPayslipMonthIndex &&
    payslipMonthIndex <= currentPayslipMonthIndex;
  const matchingPayslipAttendance = employeeAttendanceRecords.find((record) => record.month === payslipMonthKey);
  const payslipAttendance = sharedPayslip || matchingPayslipAttendance || (!attendance.month ? attendance : {});
  const payslipIsShared = Boolean(sharedPayslip && payslipIsInEmploymentWindow);
  const payslipMonthDays =
    Number(payslipAttendance.monthDays) ||
    new Date(payslipMonth.getFullYear(), payslipMonth.getMonth() + 1, 0).getDate();
  const payslipMonthlyCtc = Number(payslipAttendance.monthlyCtc) || parseSalaryAmount(salaryBand) || Number(employee.salaryNetPay) || 0;
  const payslipMonthlyNetPay =
    Number(payslipAttendance.monthlyNetPay) ||
    Number(payslipAttendance.salaryNetPay) ||
    Number(employee.salaryNetPay) ||
    payslipMonthlyCtc;
  const payslipPresentDays = Number(payslipAttendance.presentDays ?? payslipAttendance.present) || 0;
  const payslipPaidLeaves = Number(payslipAttendance.paidLeaves ?? payslipAttendance.leaves) || 0;
  const payslipSundays = Number(payslipAttendance.sundays) || 0;
  const payslipHolidays = Number(payslipAttendance.holidays) || 0;
  const payslipSalaryDays = payslipPresentDays + payslipSundays + payslipHolidays + payslipPaidLeaves;
  const payslipLopDays = Math.max(0, payslipMonthDays - payslipSalaryDays);
  const employeeDetails = employee.employeeDetails || {};
  const payslipParams = new URLSearchParams({
    employee: employeeName,
    employeeId,
    month: payslipMonthTitle,
    band: salaryBand,
    designation: employee.grade || "",
    department: employee.department || "",
    joiningDate: employee.joiningDate || "",
    pan: employeeDetails.panCard || "",
    uan: employeeDetails.uan || "",
    bankName: /^(bank added|pending)$/i.test(employee.bankStatus || "") ? "" : employee.bankStatus || "",
    bankAccountNumber: employeeDetails.accountNo || "",
    monthDays: String(payslipMonthDays),
    presentDays: String(payslipPresentDays),
    paidLeaves: String(payslipPaidLeaves),
    lopDays: String(payslipLopDays),
    monthlyCtc: String(payslipMonthlyCtc),
    monthlyNetPay: String(payslipMonthlyNetPay),
    salaryDays: String(payslipSalaryDays || payslipPresentDays),
    salaryExcludingOt: String(Number(payslipAttendance.salaryExcludingOt) || payslipMonthlyNetPay),
    otHours: String(Number(payslipAttendance.otHours ?? payslipAttendance.overtime) || 0),
    otAmount: String(Number(payslipAttendance.otAmount) || 0),
    totalPay: String(Number(payslipAttendance.totalPay) || payslipMonthlyNetPay)
  });
  const payslipDownloadUrl = apiUrl(`/api/pdf/payslip?${payslipParams.toString()}`);
  const todayKey = formatStorageDate(today);
  const activityStorageKey = getActivityStorageKey(employeeId, today);
  const sessionStorageKey = `talme-employee-phone-session-${employeeId}-${todayKey}`;
  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);
  const monthTitle = useMemo(() => formatMonthTitle(visibleMonth), [visibleMonth]);
  const selectedDateKey = selectedCalendarDate ? formatStorageDate(selectedCalendarDate) : "";
  const selectedDateActivity = useMemo(
    () => sortActivity(calendarActivityByDate[selectedDateKey] || []),
    [calendarActivityByDate, selectedDateKey]
  );
  const selectedActivityState = useMemo(() => getActivityState(selectedDateActivity), [selectedDateActivity]);
  const selectedBreakSeconds = useMemo(() => calculateActivityBreakSeconds(selectedDateActivity), [selectedDateActivity]);
  const selectedActivitySeconds = selectedCalendarDate
    ? calculateActivitySeconds(selectedDateActivity, selectedCalendarDate, today)
    : null;
  const selectedClockParts = selectedActivitySeconds === null
    ? ["--", "--", "--"]
    : formatClockParts(selectedActivitySeconds);
  const loanPaidAmount = loanProfile.totalAmount - loanProfile.remainingBalance;
  const loanPaidPercent = Math.round((loanPaidAmount / loanProfile.totalAmount) * 100);
  const notificationCount = 2 + (sharedPayslips[0] ? 1 : 0);
  const shiftAssignment = getEmployeeShiftAssignment(employee, shiftAssignments);
  const shiftTimingText = formatShiftTiming(shiftAssignment);
  const t = (key) => translate(language, key);

  useEffect(() => {
    const storedEmployeeId = window.localStorage.getItem(employeeSessionStorageKey);
    const nextEmployeeId = sessionEmployeeId || storedEmployeeId || "";

    if (nextEmployeeId) {
      setActiveSessionEmployeeId(nextEmployeeId);
    }
  }, [sessionEmployeeId]);

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (activeTab === "calendar") {
      setVisibleMonth(getMonthStart());
      setSelectedCalendarDate(null);
    }
  }, [activeTab]);

  useEffect(() => {
    const storedLanguage = window.localStorage.getItem("talme-employee-app-language") || "en";

    setLanguage(storedLanguage);
    setDraftLanguage(storedLanguage);
  }, []);

  useEffect(() => {
    setLeaveRequests(data.leaveRequests.filter((leave) => leave.employee === employee.name));
    setDocuments(data.documents.filter((document) => document.owner === employee.name));
  }, [data.documents, data.leaveRequests, employee.name]);

  useEffect(() => {
    const syncShiftAssignments = async () => {
      const localAssignments = readShiftAssignments(data.shiftAssignments || []);

      setShiftAssignments(localAssignments);

      try {
        const response = await fetch(apiUrl("/api/shift-assignments"));

        if (response.ok) {
          const rows = await response.json();
          setShiftAssignments({
            ...localAssignments,
            ...normalizeShiftAssignments(rows)
          });
        }
      } catch {
        setShiftAssignments(localAssignments);
      }
    };

    syncShiftAssignments();
    window.addEventListener("storage", syncShiftAssignments);
    window.addEventListener("focus", syncShiftAssignments);

    return () => {
      window.removeEventListener("storage", syncShiftAssignments);
      window.removeEventListener("focus", syncShiftAssignments);
    };
  }, [data.shiftAssignments]);

  useEffect(() => {
    const storedActivity = window.localStorage.getItem(activityStorageKey);
    const storedSession = window.localStorage.getItem(sessionStorageKey);

    setActivity(storedActivity ? JSON.parse(storedActivity) : []);
    setWorkSession(storedSession ? JSON.parse(storedSession) : {
      startAt: null,
      endAt: null,
      breakStartedAt: null,
      breakSeconds: 0
    });
  }, [activityStorageKey, sessionStorageKey]);

  useEffect(() => {
    if (activity.length) {
      window.localStorage.setItem(activityStorageKey, JSON.stringify(activity));
    }
  }, [activity, activityStorageKey]);

  useEffect(() => {
    if (activeTab !== "calendar") {
      return;
    }

    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const nextActivityByDate = {};

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      const dateKey = formatStorageDate(date);
      const storedActivity = window.localStorage.getItem(getActivityStorageKey(employeeId, date));

      if (storedActivity) {
        nextActivityByDate[dateKey] = JSON.parse(storedActivity);
      }
    }

    if (formatStorageDate(visibleMonth).slice(0, 7) === todayKey.slice(0, 7) && activity.length) {
      nextActivityByDate[todayKey] = activity;
    }

    setCalendarActivityByDate(nextActivityByDate);
  }, [activeTab, activity, employeeId, todayKey, visibleMonth]);

  useEffect(() => {
    if (workSession) {
      window.localStorage.setItem(sessionStorageKey, JSON.stringify(workSession));
    }
  }, [workSession, sessionStorageKey]);

  const isPunchedIn = useMemo(() => {
    return Boolean(workSession?.startAt && !workSession?.breakStartedAt);
  }, [workSession]);

  const elapsedBreakSeconds = useMemo(() => {
    if (!workSession) return 0;

    const runningBreakSeconds = workSession.breakStartedAt
      ? Math.floor((today.getTime() - new Date(workSession.breakStartedAt).getTime()) / 1000)
      : 0;

    return (workSession.breakSeconds || 0) + Math.max(0, runningBreakSeconds);
  }, [today, workSession]);

  const elapsedWorkSeconds = useMemo(() => {
    if (!workSession?.startAt) return 0;

    const endTime = workSession.endAt ? new Date(workSession.endAt) : today;
    const grossSeconds = Math.floor((endTime.getTime() - new Date(workSession.startAt).getTime()) / 1000);

    return Math.max(0, grossSeconds - elapsedBreakSeconds);
  }, [elapsedBreakSeconds, today, workSession]);

  const [workHours, workMinutes, workSeconds] = formatClockParts(elapsedWorkSeconds);

  function addActivity(type) {
    setActivity((current) => [{ type, time: nowTime(), timestamp: new Date().toISOString() }, ...current]);
  }

  function togglePunch() {
    const now = new Date();
    const nowIso = now.toISOString();

    if (isPunchedIn) {
      addActivity("Punch Out");
      setWorkSession((current) => ({
        ...(current || { startAt: nowIso, breakSeconds: 0 }),
        endAt: null,
        breakStartedAt: nowIso
      }));
      return;
    }

    addActivity("Punch In");
    setWorkSession((current) => ({
      startAt: current?.startAt || nowIso,
      endAt: null,
      breakStartedAt: null,
      breakSeconds: (current?.breakSeconds || 0) + (
        current?.breakStartedAt
          ? Math.max(0, Math.floor((now.getTime() - new Date(current.breakStartedAt).getTime()) / 1000))
          : 0
      )
    }));
  }

  function moveCalendarMonth(direction) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
  }

  function movePayslipMonth(direction) {
    setPayslipMonth((current) => {
      const next = new Date(current.getFullYear(), current.getMonth() + direction, 1);
      const nextIndex = getMonthIndex(next);

      if (nextIndex < earliestPayslipMonthIndex) return earliestPayslipMonth;
      if (nextIndex > currentPayslipMonthIndex) return currentPayslipMonth;

      return next;
    });
  }

  function resetSwipe() {
    setSwiping(false);
    setSwipeOffset(0);
  }

  function startSwipe(event) {
    const bounds = event.currentTarget.getBoundingClientRect();

    swipeStartX.current = event.clientX;
    swipeMaxOffset.current = Math.max(0, bounds.width - 60);
    setSwiping(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveSwipe(event) {
    if (!swiping) return;

    const offset = Math.min(
      swipeMaxOffset.current,
      Math.max(0, event.clientX - swipeStartX.current)
    );

    setSwipeOffset(offset);
  }

  function finishSwipe(event) {
    if (!swiping) return;

    event.currentTarget.releasePointerCapture(event.pointerId);

    if (swipeOffset >= swipeMaxOffset.current * 0.72) {
      togglePunch();
    }

    resetSwipe();
  }

  function applyLanguage() {
    setLanguage(draftLanguage);
    window.localStorage.setItem("talme-employee-app-language", draftLanguage);
    setLanguageMessage(translate(draftLanguage, "languageApplied"));
    window.setTimeout(() => {
      setLanguageMessage("");
      setActiveTab("home");
    }, 1200);
  }

  async function submitLeave(event) {
    event.preventDefault();
    const payload = {
      employee: employeeName,
      leaveType: leaveForm.leaveType,
      dates: `${leaveForm.from} to ${leaveForm.to}`,
      balance: "Submitted from employee app",
      approver: employee.manager || "Manager",
      status: "Pending",
      tone: "gold"
    };

    const response = await fetch(apiUrl("/api/leave-requests"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const created = await response.json();
      setLeaveRequests((current) => [created, ...current]);
      setLeaveForm((current) => ({ ...current, reason: "" }));
      setLeaveTab("pending");
    }
  }

  async function uploadDocument(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("module", "Employee");
    formData.append("owner", employeeName);
    formData.append("label", file.name);

    const response = await fetch(apiUrl("/api/uploads"), {
      method: "POST",
      body: formData
    });

    if (response.ok) {
      const asset = await response.json();
      setDocuments((current) => [
        {
          id: asset.id,
          docType: asset.label,
          status: "Uploaded",
          expiry: "Uploaded today"
        },
        ...current
      ]);
    }
    setUploading(false);
  }

  return (
    <div className="phone-app-shell">
      <div className="phone-device">
        <div className="phone-status">
          <strong>10:40</strong>
          <span>Vo WiFi</span>
          <span>29%</span>
        </div>

        {activeTab === "home" && (
          <>
            <section className="phone-screen home-screen">
              <header className="phone-hero">
                <button className="phone-menu-button" onClick={() => setDrawerOpen(true)} type="button">=</button>
                <div>
                  <p>{t("welcome")}</p>
                  <h1>{employeeName}</h1>
                </div>
                <strong className="phone-date">{formatDisplayDate(today)}</strong>
              </header>

              <article className="hours-card">
                <h2>{t("workingHours")}</h2>
                <div className="time-boxes">
                  <strong>{workHours}</strong><span>:</span><strong>{workMinutes}</strong><span>:</span><strong>{workSeconds}</strong>
                </div>
                <div className="time-labels"><span>{t("hour")}</span><span>{t("min")}</span><span>{t("sec")}</span></div>
                <div className="break-pill">{t("totalBreak")} {formatBreakTime(elapsedBreakSeconds)}</div>
              </article>

              <div className="shift-card">{shiftTimingText}</div>

              <section className="phone-section">
                <h2>{t("todaysActivity")}</h2>
                {activity.map((entry, index) => (
                  <div className="activity-row" key={`${entry.type}-${entry.time}-${index}`}>
                    <span className={entry.type.includes("Out") || entry.type.includes("Start") ? "danger" : "ok"}>
                      {entry.type.includes("Out") || entry.type.includes("Start") ? ">" : "<"}
                    </span>
                    <strong>{entry.type}</strong>
                    <time>{entry.time}</time>
                  </div>
                ))}
              </section>
            </section>

            <div className="phone-action-stack">
              <button
                className={`swipe-button ${swiping ? "swiping" : ""}`}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    togglePunch();
                  }
                }}
                onPointerCancel={resetSwipe}
                onPointerDown={startSwipe}
                onPointerMove={moveSwipe}
                onPointerUp={finishSwipe}
                style={{ "--swipe-offset": `${swipeOffset}px` }}
                type="button"
              >
                <span>&gt;&gt;</span>{isPunchedIn ? t("swipePunchOut") : t("swipePunch")}
              </button>
            </div>
          </>
        )}

        {activeTab === "calendar" && (
          <section className="phone-screen">
            {selectedCalendarDate ? (
              <>
                <header className="phone-page-head regularization-head">
                  <button className="phone-back-button" onClick={() => setSelectedCalendarDate(null)} type="button">&lt;</button>
                  <h1>Regularization</h1>
                  <span className="regularization-date">CAL {formatRegularizationDate(selectedCalendarDate)}</span>
                </header>

                <article className={`hours-card regularization-hours ${selectedActivityState.hasError ? "has-error" : ""}`}>
                  <h2>Working Hours</h2>
                  <div className="time-boxes">
                    <strong>{selectedClockParts[0]}</strong><span>:</span><strong>{selectedClockParts[1]}</strong><span>:</span><strong>{selectedClockParts[2]}</strong>
                  </div>
                  <div className="time-labels"><span>Hour</span><span>Min</span><span>Sec</span></div>
                  <div className="break-pill">Total Break Time {selectedDateActivity.length ? formatBreakTime(selectedBreakSeconds) : "--h:--m"}</div>
                </article>
                <div className="shift-card">{shiftTimingText}</div>

                {selectedActivityState.hasError ? (
                  <div className="regularization-error">⚠ Punch Out is missing for this date.</div>
                ) : null}

                <section className="phone-section regularization-activity">
                  <div className="activity-section-head">
                    <h2>Your activity</h2>
                    <button type="button">Add Punch</button>
                  </div>
                  {selectedDateActivity.length ? (
                    selectedDateActivity.map((entry, index) => (
                      <div className="activity-row" key={`${entry.type}-${entry.time}-${index}`}>
                        <span className={entry.type.includes("Out") ? "danger" : "ok"}>
                          {entry.type.includes("Out") ? ">" : "<"}
                        </span>
                        <strong>{entry.type}</strong>
                        <time>{entry.time}</time>
                      </div>
                    ))
                  ) : (
                    <EmptyState />
                  )}
                </section>
              </>
            ) : (
              <>
                <header className="phone-page-head">
                  <h1>{t("calendar")}</h1>
                  <div className="view-toggle"><span>CAL</span><span>LIST</span></div>
                </header>
                <div className="month-row">
                  <button onClick={() => moveCalendarMonth(-1)} type="button">&lt;</button>
                  <h2>{monthTitle}</h2>
                  <button onClick={() => moveCalendarMonth(1)} type="button">&gt;</button>
                </div>
                <div className="weekdays">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}</div>
                <div className="calendar-grid">
                  {calendarDays.map((day, index) => {
                    if (!day) {
                      return <span className="day blank" key={`blank-${index}`} />;
                    }

                    const date = getDateFromCalendarDay(visibleMonth, day);
                    const dateKey = formatStorageDate(date);
                    const records = calendarActivityByDate[dateKey] || [];

                    return (
                      <button
                        className={`day ${getCalendarStatus(visibleMonth, day, today, records)}`}
                        key={dateKey}
                        onClick={() => setSelectedCalendarDate(date)}
                        type="button"
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
                <div className="legend-grid">
                  {[
                    ["leave", "On leave"], ["present", "Present"], ["absent", "Absent"], ["half", "Half Day"],
                    ["weekoff", "Week Off"], ["holiday", "Holiday"], ["late", "Late"], ["error", "Punch Error"]
                  ].map(([tone, label]) => <span key={tone}><i className={tone} />{label}</span>)}
                </div>
                <section className="pending-card">
                  <h2>{t("pendingRegularization")}</h2>
                  <EmptyState compact />
                </section>
              </>
            )}
          </section>
        )}

        {activeTab === "leave" && (
          <section className="phone-screen">
            <header className="phone-page-head"><h1>{t("leave")}</h1></header>
            <div className="phone-tabs">
              <button className={leaveTab === "pending" ? "active" : ""} onClick={() => setLeaveTab("pending")} type="button">Pending</button>
              <button className={leaveTab === "history" ? "active" : ""} onClick={() => setLeaveTab("history")} type="button">History</button>
              <button
                className={leaveTab === "apply" ? "active" : ""}
                onClick={() => {
                  const currentDate = formatStorageDate(new Date());
                  setLeaveForm((current) => ({
                    ...current,
                    from: currentDate,
                    to: currentDate
                  }));
                  setLeaveTab("apply");
                }}
                type="button"
              >
                Apply
              </button>
            </div>
            {leaveTab === "apply" ? (
              <form className="phone-form" onSubmit={submitLeave}>
                <label>Leave Type<select value={leaveForm.leaveType} onChange={(event) => setLeaveForm((current) => ({ ...current, leaveType: event.target.value }))}><option>Casual Leave</option><option>Sick Leave</option><option>Earned Leave</option></select></label>
                <label>From<input type="date" value={leaveForm.from} onChange={(event) => setLeaveForm((current) => ({ ...current, from: event.target.value }))} /></label>
                <label>To<input type="date" value={leaveForm.to} onChange={(event) => setLeaveForm((current) => ({ ...current, to: event.target.value }))} /></label>
                <label>Reason<textarea value={leaveForm.reason} onChange={(event) => setLeaveForm((current) => ({ ...current, reason: event.target.value }))} /></label>
                <button className="phone-primary" type="submit">Apply Leave</button>
              </form>
            ) : leaveRequests.length ? (
              <div className="phone-list">
                {leaveRequests.map((leave) => <StatLine key={leave.id} label={`${leave.leaveType} - ${leave.dates}`} value={leave.status} />)}
              </div>
            ) : <EmptyState />}
          </section>
        )}

        {activeTab === "payslips" && (
          <section className="phone-screen">
            <header className="phone-page-head"><h1>{t("payslips")}</h1></header>
            <div className="month-row">
              <button disabled={!canMovePayslipPrevious} onClick={() => movePayslipMonth(-1)} type="button">&lt;</button>
              <h2>{payslipMonth.getFullYear()}</h2>
              <button disabled={!canMovePayslipNext} onClick={() => movePayslipMonth(1)} type="button">&gt;</button>
            </div>
            <div className="payslip-card">
              <h2>{payslipMonthTitle}</h2>
              {payslipIsShared ? (
                <>
                  <StatLine label="Employee" value={employeeName} />
                  <StatLine label="Band" value={salaryBand} />
                  <StatLine label="Present Days" value={payslipPresentDays} />
                  <a className="phone-primary" href={payslipDownloadUrl} target="_blank" rel="noreferrer">{t("downloadPayslip")}</a>
                </>
              ) : (
                <>
                  <EmptyState compact />
                  <p className="payslip-note">Payslip will appear after payroll shares it for this month.</p>
                </>
              )}
            </div>
          </section>
        )}

        {activeTab === "notifications" && (
          <section className="phone-screen">
            <header className="phone-page-head"><h1>{t("notifications")} <span>({notificationCount})</span></h1></header>
            <div className="phone-list">
              {sharedPayslips[0] ? <StatLine label={`${sharedPayslips[0].monthLabel} payslip is ready for download`} value="Payroll" /> : null}
              <StatLine label="Punch regularization closes today" value="Attendance" />
              <StatLine label="Holiday list updated for May" value="HR" />
            </div>
          </section>
        )}

        {activeTab === "loans" && (
          <section className="phone-screen">
            <header className="phone-page-head">
              <button className="phone-back-button" onClick={() => setActiveTab("home")} type="button">&lt;</button>
              <h1>{t("loanArrears")}</h1>
            </header>

            {loanProfile.hasLoan ? (
              <div className="loan-page">
                <section className="loan-hero-card">
                  <span>{t("loanSummary")}</span>
                  <h2>{formatCurrency(loanProfile.totalAmount)} Total Loan</h2>
                  <p>{formatCurrency(loanProfile.remainingBalance)} Remaining</p>
                  <div className="loan-progress-head">
                    <strong>Loan Progress</strong>
                    <strong>{loanPaidPercent}% Paid</strong>
                  </div>
                  <div className="loan-progress-bar">
                    <span style={{ width: `${loanPaidPercent}%` }} />
                  </div>
                </section>

                <div className="loan-summary-grid">
                  <StatLine label="Monthly EMI" value={formatCurrency(loanProfile.monthlyEmi)} />
                  <StatLine label="Next Deduction" value={loanProfile.nextDeduction} />
                  <StatLine label="Arrears Pending" value={formatCurrency(loanProfile.arrearsAmount)} />
                </div>

                <section className="loan-card">
                  <h2>{t("loanDetails")}</h2>
                  <StatLine label="Loan ID" value={loanProfile.loanId} />
                  <StatLine label="Type" value={loanProfile.type} />
                  <StatLine label="Date" value={loanProfile.loanDate} />
                  <StatLine label="Interest" value={loanProfile.interest} />
                </section>

                <section className="loan-card">
                  <h2>{t("emiHistory")}</h2>
                  {loanProfile.emiHistory.map((emi) => (
                    <div className="emi-row" key={emi.month}>
                      <span>{emi.month}</span>
                      <strong>{formatCurrency(emi.amount)}</strong>
                      <em className={emi.status.toLowerCase()}>{emi.status}</em>
                    </div>
                  ))}
                </section>

                <section className="loan-card arrears-card">
                  <h2>{t("arrears")}</h2>
                  <strong>{formatCurrency(loanProfile.arrearsAmount)} {loanProfile.arrearsStatus}</strong>
                  <p>Reason: {loanProfile.arrearsReason}</p>
                </section>

                <div className="loan-actions">
                  <button className="phone-primary" onClick={() => setLoanMessage("Loan request sent to HR for approval.")} type="button">{t("requestLoan")}</button>
                  <button className="ghost-button" onClick={() => setLoanMessage("Statement preview will be available after payroll closes.")} type="button">{t("viewStatement")}</button>
                  <button className="ghost-button" onClick={() => setLoanMessage("Payroll query raised for HR review.")} type="button">{t("raiseQuery")}</button>
                  <button className="ghost-button" onClick={() => setLoanMessage("Loan summary download is being prepared.")} type="button">{t("downloadSummary")}</button>
                </div>

                {loanMessage ? <p className="loan-message">{loanMessage}</p> : null}
              </div>
            ) : (
              <div className="loan-empty-state">
                <div className="phone-empty-art">
                  <div className="empty-face" />
                  <div className="empty-glass">?</div>
                  <div className="empty-board">x</div>
                </div>
                <h2>{t("noLoans")}</h2>
                <p>{t("noLoansText")}</p>
                <button className="phone-primary" onClick={() => setLoanMessage("Loan request sent to HR for approval.")} type="button">{t("requestLoan")}</button>
                {loanMessage ? <p className="loan-message">{loanMessage}</p> : null}
              </div>
            )}
          </section>
        )}

        {drawerOpen && (
          <aside className="phone-drawer">
            <button className="drawer-backdrop" onClick={() => setDrawerOpen(false)} type="button" aria-label="Close menu" />
            <div className="drawer-panel">
              <div className="drawer-profile">
                <div className="avatar-circle" />
                <h2>{employeeName}</h2>
                <p>Employee Id: {employeeId} &gt;</p>
              </div>
              <button onClick={() => { setActiveTab("documents"); setDrawerOpen(false); }} type="button">{t("myDocuments")}</button>
              <button onClick={() => { setActiveTab("loans"); setDrawerOpen(false); }} type="button">{t("loanArrears")}</button>
              <button onClick={() => { setActiveTab("language"); setDrawerOpen(false); }} type="button">{t("appLanguage")}</button>
              <small>{t("benefits")}</small>
              <button type="button">Deals</button>
              <button type="button">Check Update</button>
              <button
                className="logout"
                onClick={() => {
                  window.localStorage.removeItem(employeeSessionStorageKey);
                  router.push("/employee-app/login");
                }}
                type="button"
              >
                {t("logout")} <em>v 2.0.9</em>
              </button>
            </div>
          </aside>
        )}

        {activeTab === "language" && (
          <section className="phone-screen">
            <header className="phone-page-head">
              <button className="phone-back-button" onClick={() => setActiveTab("home")} type="button">&lt;</button>
              <h1>{t("appLanguage")}</h1>
            </header>

            <div className="language-page">
              <p>{t("selectLanguage")}</p>
              <div className="language-list">
                {appLanguages.map((item) => (
                  <label className="language-option" key={item.id}>
                    <input
                      checked={draftLanguage === item.id}
                      name="employee-app-language"
                      onChange={() => {
                        setDraftLanguage(item.id);
                        setLanguageMessage("");
                      }}
                      type="radio"
                    />
                    <span />
                    <strong>{item.nativeName}</strong>
                    <small>{item.englishName}</small>
                  </label>
                ))}
              </div>
            </div>

            {languageMessage ? (
              <div className="language-success">
                <p>{languageMessage}</p>
              </div>
            ) : null}

            <div className="language-apply-bar">
              <button className="phone-primary" onClick={applyLanguage} type="button">{translate(draftLanguage, "apply")}</button>
            </div>
          </section>
        )}

        {activeTab === "documents" && (
          <section className="phone-screen">
            <header className="phone-page-head"><h1>{t("myDocuments")}</h1></header>
            <label className="upload-card">
              {uploading ? "Uploading..." : t("uploadDocument")}
              <input type="file" onChange={uploadDocument} />
            </label>
            <div className="phone-list">
              {documents.length ? documents.map((document) => (
                <StatLine key={document.id} label={document.docType} value={document.status} />
              )) : <EmptyState />}
            </div>
          </section>
        )}

        {tabs.some((tab) => tab.id === activeTab) ? (
          <nav className="phone-bottom-nav">
            {tabs.map((tab) => (
              <button className={activeTab === tab.id ? "active" : ""} onClick={() => setActiveTab(tab.id)} type="button" key={tab.id}>
                <span>{tab.icon}</span>
                <small>{t(tab.id)}</small>
              </button>
            ))}
          </nav>
        ) : null}
      </div>
    </div>
  );
}
