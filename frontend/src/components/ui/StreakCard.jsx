import React, { useState, useMemo } from 'react';
import styles from './StreakCard.module.css';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

const StreakCard = ({
  title = 'Your Game Streak',
  subtitle,
  data: propData, // Accepts external data if provided
  startDate,
  endDate,
  onDayClick,
}) => {
  const [tooltip, setTooltip] = useState(null);

  // ✅ Use provided data or fallback to the exact June 2026 mock data
  const data = useMemo(() => {
    if (propData && propData.length > 0) return propData;
    
    // Generate exactly 30 days for June 2026
    const mockData = [];
    for (let day = 1; day <= 30; day++) {
      const dateStr = `2026-06-${String(day).padStart(2, '0')}`;
      let count = 0;
      
      // Specific games as requested
      if (day === 12) count = 3;
      else if (day === 13) count = 12;
      else if (day === 14) count = 7;
      
      // Determine level (0-4) based on count for the Yellow->Red gradient
      let level = 0;
      if (count === 0) level = 0;
      else if (count <= 3) level = 1;   // Yellow
      else if (count <= 6) level = 2;   // Bright Yellow
      else if (count <= 9) level = 3;   // Orange
      else level = 4;                   // Red
      
      mockData.push({ date: dateStr, count, level });
    }
    return mockData;
  }, [propData]);

  // Organize data into weeks (columns)
  const weeks = useMemo(() => {
    const weeksArray = [];
    let currentWeek = [];

    data.forEach((day, index) => {
      currentWeek.push(day);
      if (currentWeek.length === 7 || index === data.length - 1) {
        weeksArray.push(currentWeek);
        currentWeek = [];
      }
    });

    return weeksArray;
  }, [data]);

  // Generate month labels with proper spacing
  const monthLabels = useMemo(() => {
    const labels = [];
    let lastMonth = -1;

    weeks.forEach((week, weekIndex) => {
      const firstDay = week[0];
      if (firstDay) {
        const date = new Date(firstDay.date);
        const month = date.getMonth();
        const year = date.getFullYear();
        
        if (month !== lastMonth) {
          labels.push({ 
            month: `${MONTH_NAMES[month]} ${year}`, 
            weekIndex
          });
          lastMonth = month;
        }
      }
    });

    return labels;
  }, [weeks]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = data.reduce((sum, d) => sum + d.count, 0);

    let longestStreak = 0;
    let currentStreak = 0;
    let tempStreak = 0;

    // Calculate current streak (from the last day backwards)
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i].count > 0) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Calculate longest streak
    data.forEach((day) => {
      if (day.count > 0) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    });

    return { total, longestStreak, currentStreak };
  }, [data]);

  const handleMouseEnter = (e, day) => {
    const rect = e.target.getBoundingClientRect();
    // Changed "contribution" to "game" to match your context
    setTooltip({
      text: `${day.count} game${day.count !== 1 ? 's' : ''} on ${day.date}`,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  return (
    <div className={styles.card}>
      {/* Header */}
      <div className={styles.cardHeader}>
        <div>
          <h3 className={styles.cardTitle}>{title}</h3>
          {subtitle && (
            <p className={styles.cardSubtitle}>{subtitle}</p>
          )}
        </div>
      </div>

      {/* Graph Wrapper */}
      <div className={styles.graphWrapper}>
        {/* Month Labels */}
        <div className={styles.monthLabels}>
          {weeks.map((_, weekIndex) => {
            const label = monthLabels.find((l) => l.weekIndex === weekIndex);
            return (
              <div
                key={weekIndex}
                className={styles.monthLabel}
              >
                {label ? label.month : ''}
              </div>
            );
          })}
        </div>

        {/* Graph Container */}
        <div className={styles.graphContainer}>
          <div className={styles.graph}>
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className={styles.weekColumn}>
                {week.map((day, dayIndex) => (
                  <div
                    key={`${weekIndex}-${dayIndex}`}
                    className={`${styles.dayCell} ${styles[`level${day.level}`]}`}
                    onMouseEnter={(e) => handleMouseEnter(e, day)}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => onDayClick?.(day)}
                    role="img"
                    aria-label={`${day.count} games on ${day.date}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Day Labels */}
        <div className={styles.dayLabels}>
          {DAY_LABELS.map((label, i) => (
            <div key={i} className={styles.dayLabel}>
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <span className={styles.legendLabel}>Less</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={styles.legendBox}
            style={{
              backgroundColor:
                level === 0
                  ? '#ebedf0'
                  : level === 1
                  ? '#fff59d'
                  : level === 2
                  ? '#ffd54f'
                  : level === 3
                  ? '#ffb74d'
                  : '#e53935',
            }}
          />
        ))}
        <span className={styles.legendLabel} style={{ marginLeft: 8 }}>
          More
        </span>
      </div>

      {/* Stats */}
      <div className={styles.statsSection}>
        <div className={styles.statItem}>
          <div className={styles.statValue}></div>
          <div className={styles.statLabel}>Total Games</div>
          {startDate && endDate && (
            <div className={styles.statDateRange}>
              {startDate} – {endDate}
            </div>
          )}
        </div>
        <div className={styles.statItem}>
          <div className={styles.statValue}>{stats.longestStreak}</div>
          <div className={styles.statLabel}>Longest Streak</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statValue}>{stats.currentStreak}</div>
          <div className={styles.statLabel}>Current Streak</div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className={styles.tooltip}
          style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y,
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
};

export default StreakCard;