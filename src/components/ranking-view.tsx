import React from "react";
import { Card, CardHeader, CardBody, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useTournament } from "./tournament-context";

export const RankingView: React.FC = () => {
  const { state, syncData } = useTournament();
  
  // Add connection status indicator
  const [isConnected, setIsConnected] = React.useState<boolean | null>(null);
  
  // Check Firebase connection status - исправляем для предотвращения моргания
  React.useEffect(() => {
    let isMounted = true;
    
    const checkConnection = async () => {
      try {
        if (isMounted) {
          setIsConnected(true);
        }
      } catch (error) {
        if (isMounted) {
          console.error("Firebase connection error:", error);
          setIsConnected(false);
        }
      }
    };
    
    // Проверяем соединение только один раз при монтировании
    checkConnection();
    
    return () => {
      isMounted = false;
    };
  }, []);
  
  // Sort players by chips in descending order for ranking with null/undefined protection
  const sortedPlayers = [...(state.players || [])].sort((a, b) => {
    const aChips = (a.initialChips || 0) + ((a.rebuys || 0) * (state.rebuyChips || 0)) + ((a.addons || 0) * (state.addonChips || 0));
    const bChips = (b.initialChips || 0) + ((b.rebuys || 0) * (state.rebuyChips || 0)) + ((b.addons || 0) * (state.addonChips || 0));
    return bChips - aChips; // Sort in descending order
  });

  return (
    <div className="p-4 space-y-6">
      {/* Connection Status */}
      <div className="flex justify-end mb-4">
        {isConnected === true && (
          <div className="flex items-center gap-2 text-success bg-content1 px-3 py-1 rounded-full shadow-sm">
            <Icon icon="lucide:wifi" />
            <span>Синхронизация активна</span>
          </div>
        )}
        {isConnected === false && (
          <div className="flex items-center gap-2 text-danger bg-content1 px-3 py-1 rounded-full shadow-sm">
            <Icon icon="lucide:wifi-off" />
            <span>Нет синхронизации</span>
            <Button 
              size="sm" 
              variant="flat" 
              color="primary" 
              onPress={syncData}
              startContent={<Icon icon="lucide:refresh-cw" size={14} />}
              className="ml-2"
            >
              Повторить
            </Button>
          </div>
        )}
        {isConnected === null && (
          <div className="flex items-center gap-2 text-default-500 bg-content1 px-3 py-1 rounded-full shadow-sm">
            <Icon icon="lucide:loader" className="animate-spin" />
            <span>Проверка подключения...</span>
          </div>
        )}
      </div>
      
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Рейтинг игроков</h2>
        </CardHeader>
        <CardBody>
          <Table removeWrapper aria-label="Рейтинг игроков">
            <TableHeader>
              <TableColumn>Место</TableColumn>
              <TableColumn>Игрок</TableColumn>
              <TableColumn>Фишки</TableColumn>
              <TableColumn>Статус</TableColumn>
            </TableHeader>
            <TableBody emptyContent="Нет зарегистрированных игроков">
              {sortedPlayers.map((player, index) => {
                const totalChips = 
                  player.initialChips + 
                  (player.rebuys * state.rebuyChips) + 
                  (player.addons * state.addonChips);
                  
                return (
                  <TableRow key={player.id} className={player.isEliminated ? "opacity-60" : ""}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{player.name}</TableCell>
                    <TableCell className="font-semibold">{totalChips.toLocaleString()}</TableCell>
                    <TableCell>
                      {player.isEliminated ? (
                        <span className="text-danger flex items-center gap-1">
                          <Icon icon="lucide:x-circle" className="text-sm" />
                          Выбыл (#{player.eliminationOrder})
                        </span>
                      ) : (
                        <span className="text-success flex items-center gap-1">
                          <Icon icon="lucide:check-circle" className="text-sm" />
                          В игре
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
};