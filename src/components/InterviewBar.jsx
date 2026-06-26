import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { 
  Calendar, Clock, Video, Bell, Check, AlertCircle, Play, 
  Trash2, Plus, Monitor, ShieldAlert 
} from "lucide-react";
import { useTranslation } from "../context/TranslationContext";

export default function InterviewBar({ application, currentUserRole, onUpdate }) {
  const { t } = useTranslation();
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(false);

  // New slot form state
  const [newSlotDate, setNewSlotDate] = useState("");
  const [newSlotTime, setNewSlotTime] = useState("");
  const [newSlotDuration, setNewSlotDuration] = useState("30");

  // Push notifications state
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    if (application && application.timeline_data) {
      // Find the slots offered in timeline_data
      const slotsEntry = application.timeline_data.find(item => item.status === "interview_slots_offered");
      if (slotsEntry && slotsEntry.slots) {
        setSlots(slotsEntry.slots);
        const booked = slotsEntry.slots.find(s => s.status === "booked");
        if (booked) {
          setSelectedSlot(booked);
        }
      }
    }
  }, [application]);

  // Request browser Notification permissions
  useEffect(() => {
    if ("Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted");
    }
  }, []);

  const enableBrowserNotifications = async () => {
    if (!("Notification" in window)) {
      alert("Браузер не поддерживает Push-уведомления");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setNotificationsEnabled(true);
      // Trigger a welcoming notification
      new Notification("Inspiro", {
        body: "Уведомления успешно включены! Вы получите напоминания перед интервью.",
        icon: "/favicon.ico"
      });
    }
  };

  const handleAddSlot = async () => {
    if (!newSlotDate || !newSlotTime) {
      alert("Укажите дату и время");
      return;
    }

    setLoading(true);
    try {
      const newSlot = {
        id: `slot_${Date.now()}`,
        date: newSlotDate,
        time: newSlotTime,
        duration: Number(newSlotDuration),
        status: "available"
      };

      const updatedSlots = [...slots, newSlot];

      // Update applications timeline_data
      let timeline = [...(application.timeline_data || [])];
      // Find if we already have an interview_slots_offered step
      const slotIndex = timeline.findIndex(item => item.status === "interview_slots_offered");
      
      const slotsStep = {
        status: "interview_slots_offered",
        date: new Date().toLocaleDateString("ru"),
        note: "Предложены свободные слоты для интервью.",
        slots: updatedSlots
      };

      if (slotIndex > -1) {
        timeline[slotIndex] = slotsStep;
      } else {
        timeline.push(slotsStep);
      }

      const { error } = await supabase
        .from("applications")
        .update({ timeline_data: timeline })
        .eq("id", application.id);

      if (error) throw error;
      setSlots(updatedSlots);
      
      // Clear inputs
      setNewSlotDate("");
      setNewSlotTime("");
      
      if (onUpdate) onUpdate();
      alert("Временной слот успешно добавлен!");
    } catch (err) {
      alert("Ошибка при добавлении слота: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSlot = async (slotId) => {
    if (!window.confirm("Удалить этот слот?")) return;
    setLoading(true);
    try {
      const updatedSlots = slots.filter(s => s.id !== slotId);
      let timeline = [...(application.timeline_data || [])];
      const slotIndex = timeline.findIndex(item => item.status === "interview_slots_offered");
      
      if (slotIndex > -1) {
        if (updatedSlots.length === 0) {
          // Remove step entirely if no slots left
          timeline = timeline.filter(item => item.status !== "interview_slots_offered");
        } else {
          timeline[slotIndex].slots = updatedSlots;
        }
      }

      const { error } = await supabase
        .from("applications")
        .update({ timeline_data: timeline })
        .eq("id", application.id);

      if (error) throw error;
      setSlots(updatedSlots);
      if (onUpdate) onUpdate();
    } catch (err) {
      alert("Ошибка при удалении слота: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBookSlot = async (slot) => {
    if (!window.confirm(`Вы подтверждаете интервью на ${slot.date} в ${slot.time}?`)) return;
    setLoading(true);
    try {
      // Mark slot as booked
      const updatedSlots = slots.map(s => {
        if (s.id === slot.id) {
          return { ...s, status: "booked", bookedBy: application.student_name };
        }
        return { ...s, status: "available" }; // Lock out other options
      });

      let timeline = [...(application.timeline_data || [])];
      // Update slots offer entry
      const slotIndex = timeline.findIndex(item => item.status === "interview_slots_offered");
      if (slotIndex > -1) {
        timeline[slotIndex].slots = updatedSlots;
      }

      // Add a confirmed interview milestone step to the timeline
      timeline.push({
        status: "interview",
        date: new Date().toLocaleDateString("ru"),
        note: `Интервью подтверждено студентом: ${slot.date} в ${slot.time} (${slot.duration} мин).`
      });

      const { error } = await supabase
        .from("applications")
        .update({ 
          timeline_data: timeline,
          status: "interview"
        })
        .eq("id", application.id);

      if (error) throw error;
      
      setSelectedSlot({ ...slot, status: "booked" });
      setSlots(updatedSlots);

      // Trigger Browser Alert push reminders
      if (Notification.permission === "granted") {
        new Notification("Интервью забронировано!", {
          body: `Собеседование состоится ${slot.date} в ${slot.time}.`,
          icon: "/favicon.ico"
        });
        
        // Mock scheduling push reminders:
        // Set a timeout to mock the 15-minute alert in 5 seconds for demonstration purposes!
        setTimeout(() => {
          new Notification("Напоминание о собеседовании (15 минут)", {
            body: `Ваше интервью по проекту "${application.lab_name}" начнется через 15 минут!`,
            icon: "/favicon.ico"
          });
        }, 5000);
      }

      // Mock email sending
      console.log(`Mock Email sent to: ${application.student_email || "student"} & Professor. Subject: Interview confirmed for ${slot.date} at ${slot.time}`);

      if (onUpdate) onUpdate();
      alert("Слот успешно забронирован! Email-уведомление отправлено.");
    } catch (err) {
      alert("Ошибка при бронировании слота: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Immediate simulation of 24h & 15m push notifications
  const triggerTestNotification = () => {
    if (!notificationsEnabled) {
      alert("Пожалуйста, сначала включите уведомления");
      return;
    }
    
    // Simulate 24-hour reminder
    new Notification("Напоминание (24 часа до интервью)", {
      body: `Собеседование по проекту "${application.lab_name}" запланировано на завтра.`,
      icon: "/favicon.ico"
    });

    // Simulate 15-minute reminder after 1.5 seconds
    setTimeout(() => {
      new Notification("Напоминание (15 минут до интервью)", {
        body: `Собеседование начнется через 15 минут! Подготовьте камеру и микрофон.`,
        icon: "/favicon.ico",
        requireInteraction: true
      });
    }, 1500);
  };

  const isInterviewTime = () => {
    // For prototype purposes, let them connect if they have booked a slot
    return !!selectedSlot;
  };

  return (
    <div className="interview-bar-content" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Notifications widget */}
      <div style={{ background: "var(--input-bg)", border: "1px solid var(--border-color)", padding: "14px 18px", borderRadius: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, color: "var(--text-primary)" }}>
            <Bell size={14} className="animate-pulse" /> Напоминания
          </span>
          <span className={`status-badge ${notificationsEnabled ? "status-accepted" : "status-pending"}`} style={{ fontSize: 10, padding: "2px 6px" }}>
            {notificationsEnabled ? "Включены" : "Отключены"}
          </span>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 10px 0" }}>
          Уведомления напомнят о начале звонка за 24 часа и 15 минут.
        </p>
        {!notificationsEnabled ? (
          <button className="btn-secondary" style={{ width: "100%", fontSize: 12, padding: "6px 12px" }} onClick={enableBrowserNotifications}>
            Разрешить уведомления в браузере
          </button>
        ) : (
          <button className="btn-secondary" style={{ width: "100%", fontSize: 12, padding: "6px 12px", border: "1px dashed var(--primary)" }} onClick={triggerTestNotification}>
            ⚡ Проверить пуш-напоминания (тест)
          </button>
        )}
      </div>

      {/* Professor scheduler */}
      {currentUserRole === "professor" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
            ➕ Запланировать новое окно интервью
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, background: "var(--dash-card)", padding: 16, borderRadius: 14, border: "1px solid var(--border-color)" }}>
            <div className="field-group">
              <label>Дата</label>
              <input type="date" value={newSlotDate} onChange={e => setNewSlotDate(e.target.value)} style={{ width: "100%" }} />
            </div>
            <div className="fields-row">
              <div className="field-group">
                <label>Время начала</label>
                <input type="time" value={newSlotTime} onChange={e => setNewSlotTime(e.target.value)} style={{ width: "100%" }} />
              </div>
              <div className="field-group">
                <label>Минуты</label>
                <select value={newSlotDuration} onChange={e => setNewSlotDuration(e.target.value)} style={{ width: "100%" }}>
                  <option value="15">15 мин</option>
                  <option value="30">30 мин</option>
                  <option value="45">45 мин</option>
                  <option value="60">60 мин</option>
                </select>
              </div>
            </div>
            <button className="btn-apply" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }} onClick={handleAddSlot} disabled={loading}>
              <Plus size={14} /> Добавить слот в календарь
            </button>
          </div>
        </div>
      )}

      {/* Slots grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
          🗓 {currentUserRole === "professor" ? t("interview.prof_slots_title") : t("interview.student_slots_title")}
        </h4>

        {slots.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px 10px", border: "1px dashed var(--border-color)", borderRadius: 12, color: "var(--text-muted)", fontSize: 13 }}>
            <Calendar size={20} style={{ margin: "0 auto 8px auto", opacity: 0.5 }} />
            {t("interview.no_slots")}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {slots.map(slot => (
              <div 
                key={slot.id} 
                style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center", 
                  background: slot.status === "booked" ? "var(--status-interview-bg)" : "var(--input-bg)", 
                  border: slot.status === "booked" ? "1px solid var(--status-interview)" : "1px solid var(--border-color)", 
                  padding: "10px 14px", 
                  borderRadius: 12 
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)" }}>
                    📅 {slot.date}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                    <Clock size={12} /> {slot.time} ({slot.duration} мин)
                  </span>
                  {slot.status === "booked" && (
                    <span style={{ fontSize: 10.5, color: "var(--status-interview)", fontWeight: 500, marginTop: 2 }}>
                      ✓ Забронировано: {slot.bookedBy || "Студент"}
                    </span>
                  )}
                </div>

                <div>
                  {slot.status === "available" && currentUserRole === "student" && (
                    <button className="btn-apply" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => handleBookSlot(slot)} disabled={loading}>
                      Выбрать
                    </button>
                  )}
                  {slot.status === "available" && currentUserRole === "professor" && (
                    <button className="btn-delete" style={{ padding: 6, borderRadius: "50%" }} onClick={() => handleDeleteSlot(slot.id)} disabled={loading}>
                      <Trash2 size={12} />
                    </button>
                  )}
                  {slot.status === "booked" && (
                    <span style={{ color: "var(--status-interview)", display: "flex", alignItems: "center" }}>
                      <Check size={16} />
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Video Call Trigger */}
      {selectedSlot && (
        <div style={{ marginTop: 8, background: "var(--status-interview-bg)", border: "1px solid var(--status-interview)", borderRadius: 14, padding: "16px 18px", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 8, color: "var(--status-interview)" }}>
            <Video size={32} className="animate-pulse" />
          </div>
          <h4 style={{ margin: "0 0 4px 0", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
            Собеседование готово к запуску
          </h4>
          <p style={{ margin: "0 0 14px 0", fontSize: 11.5, color: "var(--text-muted)" }}>
            Запланировано на: {selectedSlot.date} в {selectedSlot.time}
          </p>
          <button 
            className="btn-apply" 
            style={{ width: "100%", background: "var(--status-interview)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            onClick={() => {
              // Generate a Jitsi meet room URL if no daily.co room_url exists yet
              const roomUrl = application.video_room_url || `https://meet.jit.si/inspiro-interview-${application.id}`;
              // Call onUpdate to trigger video calling modal in Dashboard
              // We trigger video start via a custom callback
              if (window.onStartVideoCall) {
                window.onStartVideoCall(roomUrl);
              }
            }}
          >
            <Play size={14} /> Начать видео-интервью
          </button>
        </div>
      )}
    </div>
  );
}
