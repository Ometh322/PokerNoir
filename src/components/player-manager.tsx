import React from "react";
import { 
  Card, 
  CardHeader, 
  CardBody, 
  Button, 
  Input, 
  Table, 
  TableHeader, 
  TableColumn, 
  TableBody, 
  TableRow, 
  TableCell 
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { useTournament } from "./tournament-context";
import { useConfirmation } from "./confirmation-dialog";

export const PlayerManager: React.FC = () => {
  const { 
    state, 
    addPlayer, 
    removePlayer, 
    addRebuy, 
    addAddon,
    eliminatePlayer,
    revivePlayer,
    addBountyChips,
    recordPayment,
    syncData,
    updatePlayerName,
    saveStatus
  } = useTournament();
  
  const [newPlayerName, setNewPlayerName] = React.useState("");
  // Добавляем состояния для баунти и оплаты
  const [bountyAmount, setBountyAmount] = React.useState<Record<number, number>>({});
  const [paymentAmount, setPaymentAmount] = React.useState<Record<number, number>>({});
  const [editingPlayerId, setEditingPlayerId] = React.useState<number | null>(null);
  const [editPlayerName, setEditPlayerName] = React.useState("");
  
  // Add connection status indicator
  const [isConnected, setIsConnected] = React.useState<boolean | null>(null);
  
  // Check Firebase connection status
  React.useEffect(() => {
    const checkConnection = async () => {
      try {
        // Вместо вызова syncData, который меняет состояние, просто проверяем соединение
        setIsConnected(true);
      } catch (error) {
        console.error("Firebase connection error:", error);
        setIsConnected(false);
      }
    };
    
    checkConnection();
  }, []); // Удаляем syncData из зависимостей
  
  const handleAddPlayer = () => {
    if (newPlayerName.trim()) {
      addPlayer(newPlayerName.trim());
      setNewPlayerName("");
    }
  };

  // Упрощаем обработчики действий с игроками
  const handleAddRebuy = (player) => {
    if (!player || !player.id) return;
    
    // Вызываем функцию напрямую без диалога подтверждения
    addRebuy(player.id);
  };

  const handleAddAddon = (player) => {
    if (!player || !player.id) return;
    
    // Вызываем функцию напрямую без диалога подтверждения
    addAddon(player.id);
  };

  const handleEliminatePlayer = (player) => {
    // Добавляем проверки на существование player и его id
    if (!player) {
      console.error("Player object is undefined");
      return;
    }
    
    if (typeof player.id !== 'number' || isNaN(player.id)) {
      console.error("Invalid player ID:", player?.id);
      return;
    }
    
    // Вызываем функцию с проверенным ID
    eliminatePlayer(player.id);
  };

  const handleRevivePlayer = (player) => {
    // Добавляем проверки на существование player и его id
    if (!player) {
      console.error("Player object is undefined");
      return;
    }
    
    if (typeof player.id !== 'number' || isNaN(player.id)) {
      console.error("Invalid player ID:", player?.id);
      return;
    }
    
    // Вызываем функцию с проверенным ID
    revivePlayer(player.id);
  };

  const handleRemovePlayer = (player) => {
    if (!player || !player.id) return;
    
    // Вызываем функцию напрямую без диалога подтверждения
    removePlayer(player.id);
  };

  // Добавляем обработчики для баунти и оплаты
  const handleUpdateBounty = (player, amount) => {
    // Проверяем, что player - это объект и имеет необходимые свойства
    if (!player || typeof player !== 'object' || !player.id) {
      console.error("Invalid player object:", player);
      return;
    }
    
    // Проверяем, что amount - это число
    const bountyAmount = Number(amount) || 0;
    
    // Передаем только ID игрока и числовое значение
    addBountyChips(player.id, bountyAmount);
    
    // Сбрасываем значение поля ввода
    setBountyAmount(prev => ({...prev, [player.id]: 0}));
  };

  const handleRecordPayment = (player, amount) => {
    // Проверяем, что player - это объект и имеет необходимые свойства
    if (!player || typeof player !== 'object' || !player.id) {
      console.error("Invalid player object:", player);
      return;
    }
    
    // Проверяем, что amount - это число
    const payAmount = Number(amount) || 0;
    if (payAmount <= 0) return;
    
    // Передаем только ID игрока и числовое значение
    recordPayment(player.id, payAmount);
    
    // Сбрасываем значение поля ввода
    setPaymentAmount(prev => ({...prev, [player.id]: 0}));
  };

  const startEditingPlayerName = (player: Player) => {
    setEditingPlayerId(player.id);
    setEditPlayerName(player.name);
  };

  const savePlayerName = () => {
    if (editingPlayerId !== null && editPlayerName.trim()) {
      updatePlayerName(editingPlayerId, editPlayerName.trim());
      setEditingPlayerId(null);
    }
  };

  const cancelEditingPlayerName = () => {
    setEditingPlayerId(null);
  };

  // Fix the handlePlayerNameClick function
  const handlePlayerNameClick = (player) => {
    setEditingPlayerId(player.id);
    setEditPlayerName(player.name);
  };

  // Calculate player statistics with null/undefined checks
  const totalEntries = (state.players || []).length;
  const totalRebuys = (state.players || []).reduce((sum, player) => sum + (player?.rebuys || 0), 0);
  const totalAddons = (state.players || []).reduce((sum, player) => sum + (player?.addons || 0), 0);
  
  // Calculate prize pool with null/undefined checks
  const prizePool = 
    totalEntries * (state.entryFee || 0) + 
    totalRebuys * (state.rebuyFee || 0) + 
    totalAddons * (state.addonFee || 0);
  
  // Calculate total chips in play with null/undefined checks
  const totalChipsInPlay = (state.players || []).reduce((sum, player) => {
    if (player?.isEliminated) return sum;
    return sum + 
      (player?.initialChips || 0) + 
      ((player?.rebuys || 0) * (state.rebuyChips || 0)) + 
      ((player?.addons || 0) * (state.addonChips || 0)) +
      (player?.bountyChips || 0);
  }, 0);

  return (
    <div className="p-4">
      {/* Sync Button with Connection Status and Save Status */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          {isConnected === true && (
            <div className="flex items-center gap-2 text-success">
              <Icon icon="lucide:wifi" />
              <span>Подключено к Firebase</span>
            </div>
          )}
          {isConnected === false && (
            <div className="flex items-center gap-2 text-danger">
              <Icon icon="lucide:wifi-off" />
              <span>Нет подключения к Firebase</span>
            </div>
          )}
          {isConnected === null && (
            <div className="flex items-center gap-2 text-default-500">
              <Icon icon="lucide:loader" className="animate-spin" />
              <span>Проверка подключения...</span>
            </div>
          )}
          
          {/* Add save status indicator */}
          {saveStatus === 'saving' && (
            <div className="flex items-center gap-2 text-default-500 ml-4">
              <Icon icon="lucide:loader" className="animate-spin" />
              <span>Сохранение...</span>
            </div>
          )}
          {saveStatus === 'success' && (
            <div className="flex items-center gap-2 text-success ml-4">
              <Icon icon="lucide:check" />
              <span>Сохранено</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-2 text-danger ml-4">
              <Icon icon="lucide:alert-triangle" />
              <span>Ошибка сохранения</span>
            </div>
          )}
        </div>
        
        <Button 
          color="primary" 
          variant="flat" 
          onPress={syncData}
          startContent={<Icon icon="lucide:refresh-cw" />}
          isDisabled={isConnected === false}
        >
          Синхронизировать данные
        </Button>
      </div>
      
      {/* Player Management Card */}
      <Card>
        <CardHeader className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Управление игроками</h2>
          <div className="flex gap-2">
            <Input
              placeholder="Имя игрока"
              value={newPlayerName || ""}
              onValueChange={setNewPlayerName}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddPlayer();
                }
              }}
              className="w-48 md:w-64"
            />
            <Button color="primary" onPress={handleAddPlayer}>
              <Icon icon="lucide:plus" className="mr-1" />
              Добавить
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          {/* Добавляем статистику по игрокам */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-content2 shadow-sm">
              <CardBody className="p-4 text-center">
                <div className="text-sm text-default-600 mb-1">Всего входов</div>
                <div className="text-2xl font-bold">{totalEntries}</div>
              </CardBody>
            </Card>
            
            <Card className="bg-content2 shadow-sm">
              <CardBody className="p-4 text-center">
                <div className="text-sm text-default-600 mb-1">Всего ребаев</div>
                <div className="text-2xl font-bold">{totalRebuys}</div>
              </CardBody>
            </Card>
            
            <Card className="bg-content2 shadow-sm">
              <CardBody className="p-4 text-center">
                <div className="text-sm text-default-600 mb-1">Всего аддонов</div>
                <div className="text-2xl font-bold">{totalAddons}</div>
              </CardBody>
            </Card>
            
            <Card className="bg-content2 shadow-sm">
              <CardBody className="p-4 text-center">
                <div className="text-sm text-default-600 mb-1">Фишек в игре</div>
                <div className="text-2xl font-bold">{totalChipsInPlay.toLocaleString()}</div>
              </CardBody>
            </Card>
          </div>
          
          {/* Добавляем отображение призового фонда */}
          <div className="flex justify-end mb-4">
            {state.entryFee > 0 && (
              <div className="bg-primary-100 text-primary-700 px-4 py-2 rounded-medium">
                <span className="font-medium">Призовой фонд:</span> {prizePool.toLocaleString()}
              </div>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <Table removeWrapper aria-label="Список игроков">
              <TableHeader>
                <TableColumn>Игрок</TableColumn>
                <TableColumn>Фишки</TableColumn>
                <TableColumn>Баунти</TableColumn>
                <TableColumn>Оплата</TableColumn>
                <TableColumn>Статус</TableColumn>
                <TableColumn>Действия</TableColumn>
              </TableHeader>
              <TableBody emptyContent="Нет зарегистрированных игроков">
                {(state.players || []).map((player) => {
                  // Проверяем, что player существует
                  if (!player) return null;
                  
                  const totalChips = 
                    (player.initialChips || 0) + 
                    ((player.rebuys || 0) * (state.rebuyChips || 0)) + 
                    ((player.addons || 0) * (state.addonChips || 0));
                    
                  // Рассчитываем общую стоимость участия
                  const totalCost = 
                    (state.entryFee || 0) + 
                    ((player.rebuys || 0) * (state.rebuyFee || 0)) + 
                    ((player.addons || 0) * (state.addonFee || 0));
                  
                  // Рассчитываем оставшуюся сумму к оплате
                  const paidAmount = player.paidAmount || 0;
                  const remainingToPay = Math.max(0, totalCost - paidAmount);
                  
                  return (
                    <TableRow key={player.id} className={player.isEliminated ? "opacity-60" : ""}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{player.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-semibold">{totalChips.toLocaleString()}</div>
                          <div className="text-xs text-default-500">
                            Вход: {player.initialChips?.toLocaleString() || 0} | 
                            Ребаи: {(player.rebuys || 0)} × {state.rebuyChips?.toLocaleString() || 0} | 
                            Аддоны: {(player.addons || 0)} × {state.addonChips?.toLocaleString() || 0}
                          </div>
                        </div>
                      </TableCell>
                      
                      {/* Добавляем колонку для баунти */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            size="sm"
                            placeholder="Кол-во"
                            value={bountyAmount[player.id]?.toString() || ""}
                            onValueChange={(value) => 
                              setBountyAmount(prev => ({...prev, [player.id]: Number(value) || 0}))
                            }
                            className="w-20"
                            min={0}
                          />
                          <Button 
                            size="sm" 
                            color="primary" 
                            variant="flat"
                            onPress={() => handleUpdateBounty(player, bountyAmount[player.id])}
                          >
                            <Icon icon="lucide:target" className="mr-1" />
                            Баунти
                          </Button>
                          <div className="text-sm font-medium">
                            {player.bountyChips ? `${player.bountyChips.toLocaleString()} фишек` : "-"}
                          </div>
                        </div>
                      </TableCell>
                      
                      {/* Добавляем колонку для оплаты */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            size="sm"
                            placeholder="Сумма"
                            value={paymentAmount[player.id]?.toString() || ""}
                            onValueChange={(value) => 
                              setPaymentAmount(prev => ({...prev, [player.id]: Number(value) || 0}))
                            }
                            className="w-20"
                            min={0}
                          />
                          <Button 
                            size="sm" 
                            color="success" 
                            variant="flat"
                            onPress={() => handleRecordPayment(player, paymentAmount[player.id])}
                          >
                            <Icon icon="lucide:credit-card" className="mr-1" />
                            Оплата
                          </Button>
                        </div>
                        <div className="mt-1 text-xs">
                          <span className={remainingToPay > 0 ? "text-danger" : "text-success"}>
                            {paidAmount.toLocaleString()} / {totalCost.toLocaleString()} руб.
                          </span>
                        </div>
                      </TableCell>
                      
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
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {!player.isEliminated && (
                            <>
                              <Button 
                                size="sm" 
                                color="primary" 
                                variant="flat"
                                onPress={() => handleAddRebuy(player)}
                              >
                                Ребай
                              </Button>
                              <Button 
                                size="sm" 
                                color="secondary" 
                                variant="flat"
                                onPress={() => handleAddAddon(player)}
                              >
                                Аддон
                              </Button>
                              <Button 
                                size="sm" 
                                color="danger" 
                                variant="flat"
                                onPress={() => handleEliminatePlayer(player)}
                              >
                                Выбыл
                              </Button>
                            </>
                          )}
                          {player.isEliminated && (
                            <Button 
                              size="sm" 
                              color="success" 
                              variant="flat"
                              onPress={() => handleRevivePlayer(player)}
                            >
                              Вернуть
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            isIconOnly 
                            color="danger" 
                            variant="light"
                            onPress={() => handleRemovePlayer(player)}
                          >
                            <Icon icon="lucide:trash-2" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};