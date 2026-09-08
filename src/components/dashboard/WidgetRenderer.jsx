import React from "react";
import {
  StatTilesWidget, NextMatchWidget, StandingsWidget, ScorersWidget,
  LastResultsWidget, CalendarWidget, FixturesWidget, TodayAlertsWidget, NextYouthWidget, YouthStandingsWidget
} from "@/components/dashboard/widgets/ClubWidgets";
import {
  TrainingTodayWidget, SquadStatusWidget, InjuriesWidget, QuickLinksWidget, SessionDayMapWidget,
  StaffDayScheduleWidget, WellnessPriorityWidget,
} from "@/components/dashboard/widgets/StaffWidgets";
import { NoteWidget, CounterWidget } from "@/components/dashboard/widgets/CustomWidgets";
import BirthdayWidget from "@/components/dashboard/widgets/BirthdayWidget";
import {
  CompetitionOverviewWidget, CompetitionNextMatchWidget, YouthRoundWidget,
  CompetitionTableSnapshotWidget, CompetitionAgendaWidget,
} from "@/components/dashboard/widgets/CompetitionWidgets";

const WIDGET_COMPONENTS = {
  "stat-tiles": StatTilesWidget,
  "next-match": NextMatchWidget,
  "standings": StandingsWidget,
  "scorers": ScorersWidget,
  "last-results": LastResultsWidget,
  "calendar": CalendarWidget,
  "fixtures": FixturesWidget,
  "today-alerts": TodayAlertsWidget,
  "next-youth": NextYouthWidget,
  "youth-standings": YouthStandingsWidget,
  "training-today": TrainingTodayWidget,
  "squad-status": SquadStatusWidget,
  "injuries": InjuriesWidget,
  "quick-links": QuickLinksWidget,
  "note": NoteWidget,
  "counter": CounterWidget,
  "upcoming-birthdays": BirthdayWidget,
  "competition-overview": CompetitionOverviewWidget,
  "competition-next-match": CompetitionNextMatchWidget,
  "competition-youth-round": YouthRoundWidget,
  "competition-table": CompetitionTableSnapshotWidget,
  "competition-agenda": CompetitionAgendaWidget,
  "staff-day-command": StaffDayScheduleWidget,
  "wellness-priority": WellnessPriorityWidget,
  "session-day-map": SessionDayMapWidget,
};

export default function WidgetRenderer({ widget, onConfigChange }) {
  const Comp = WIDGET_COMPONENTS[widget.type];
  if (!Comp) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center">
        <p className="text-zinc-500 text-sm">Widget no encontrado: {widget.type}</p>
      </div>
    );
  }
  return <Comp widget={widget} onConfigChange={onConfigChange} />;
}