import React from "react";
import { Tabs, Tab, Card, CardBody, CardHeader } from "@heroui/react";
import { TournamentView } from "./components/tournament-view";
import { AdminPanel } from "./components/admin-panel";
import { RankingView } from "./components/ranking-view";
import { PlayerManager } from "./components/player-manager";
import { TournamentProvider } from "./components/tournament-context";
import { ThemeSwitcher } from "./components/theme-switcher";

export default function App() {
  const [selected, setSelected] = React.useState("tournament");

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <Card className="mx-auto max-w-5xl">
        <CardHeader className="flex justify-between items-center px-4">
          <h1 className="text-xl font-bold">Poker Tournament Manager</h1>
          <ThemeSwitcher />
        </CardHeader>
        <CardBody className="p-0">
          <TournamentProvider>
            <Tabs 
              aria-label="Tournament Tabs" 
              selectedKey={selected} 
              onSelectionChange={setSelected as any}
              className="p-0"
            >
              <Tab key="tournament" title="Турнир">
                <TournamentView />
              </Tab>
              <Tab key="players" title="Игроки">
                <PlayerManager />
              </Tab>
              <Tab key="ranking" title="Рейтинг">
                <RankingView />
              </Tab>
              <Tab key="admin" title="Настройки турнира">
                <AdminPanel />
              </Tab>
            </Tabs>
          </TournamentProvider>
        </CardBody>
      </Card>
    </div>
  );
}