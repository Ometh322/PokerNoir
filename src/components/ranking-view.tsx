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
  
  // Обновленная логика сортировки игроков - сортируем по баунти вместо фишек
  const sortedPlayers = [...(state.players || [])].sort((a, b) => {
    // Проверка на null/undefined
    if (!a || !b) return 0;
    
    // Сначала сортируем по статусу выбывания (активные игроки в начале)
    if (a.isEliminated !== b.isEliminated) {
      return a.isEliminated ? 1 : -1; // Активные игроки (false) идут первыми
    }
    
    // Если оба игрока выбыли, сортируем по порядку выбывания (в обратном порядке)
    if (a.isEliminated && b.isEliminated) {
      // Игрок с большим номером выбывания (выбывший позже) должен быть выше
      return (b.eliminationOrder || 0) - (a.eliminationOrder || 0);
    }
    
    // Если оба игрока активны, сортируем по количеству баунти вместо фишек
    const aBounty = a.bountyChips || 0;
    const bBounty = b.bountyChips || 0;
    
    return bBounty - aBounty; // По убыванию количества баунти
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
              <TableColumn>Баунти</TableColumn>
              <TableColumn>Статус</TableColumn>
            </TableHeader>
            <TableBody emptyContent="Нет зарегистрированных игроков">
              {sortedPlayers.map((player, index) => {
                // Добавляем проверку на существование player
                if (!player) return null;
                
                // Используем баунти вместо расчета фишек
                const bountyChips = player.bountyChips || 0;
                  
                return (
                  <TableRow key={player.id} className={player.isEliminated ? "opacity-60" : ""}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{player.name || "Неизвестный"}</TableCell>
                    <TableCell className="font-semibold">{bountyChips.toLocaleString()}</TableCell>
                    <TableCell>
                      {player.isEliminated ? (
                        <span className="text-danger flex items-center gap-1">
                          <Icon icon="lucide:x-circle" className="text-sm" />
                          Выбыл (#{player.eliminationOrder || '?'})
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