import React from "react";
import { Card, CardHeader, CardBody, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useTournament } from "./tournament-context";

export const RankingView: React.FC = () => {
  const { state, syncData } = useTournament();
  
  // Sort players by elimination order (active players first, then by elimination order)
  // FIXED: Reverse the sorting order for eliminated players to show highest ranks first
  const sortedPlayers = [...state.players].sort((a, b) => {
    if (!a.isEliminated && !b.isEliminated) return 0;
    if (!a.isEliminated) return -1;
    if (!b.isEliminated) return 1;
    // Reverse the order: higher elimination order means better rank
    return (b.eliminationOrder || 0) - (a.eliminationOrder || 0);
  });

  // Calculate total tournament value
  const totalEntryFees = state.players?.length || 0 * state.entryFee;
  const totalRebuyFees = state.players.reduce((sum, player) => sum + player.rebuys * state.rebuyFee, 0);
  const totalAddonFees = state.players.reduce((sum, player) => sum + player.addons * state.addonFee, 0);
  const totalTournamentValue = totalEntryFees + totalRebuyFees + totalAddonFees;
  
  // Calculate total collected payments
  const totalCollected = state.players.reduce((sum, player) => sum + (player.paidAmount || 0), 0);
  const totalRemaining = totalTournamentValue - totalCollected;

  return (
    <div className="p-4 space-y-6">
      {/* Sync Button */}
      <div className="flex justify-end">
        <Button 
          color="primary" 
          variant="flat" 
          onPress={syncData}
          startContent={<Icon icon="lucide:refresh-cw" />}
        >
          Синхронизировать данные
        </Button>
      </div>

      {/* Tournament Value */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Общая стоимость турнира</h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="p-4 bg-content2 rounded-medium text-center">
              <div className="text-sm text-default-600 mb-1">Всего</div>
              <div className="text-2xl font-bold">{totalTournamentValue.toLocaleString()}</div>
            </div>
            <div className="p-4 bg-content2 rounded-medium text-center">
              <div className="text-sm text-default-600 mb-1">Собрано</div>
              <div className="text-2xl font-bold">
                {totalCollected.toLocaleString()} 
                <span className="text-sm text-default-500 ml-1">
                  ({Math.round(totalCollected / totalTournamentValue * 100)}%)
                </span>
              </div>
              <div className="text-sm text-danger">
                {totalRemaining > 0 ? `Осталось собрать: ${totalRemaining.toLocaleString()}` : 'Собрано полностью'}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-content2 rounded-medium text-center">
              <div className="text-sm text-default-600 mb-1">Входы</div>
              <div className="text-xl font-semibold">{totalEntryFees.toLocaleString()}</div>
              <div className="text-xs text-default-500">{state.players?.length || 0} × {state.entryFee.toLocaleString()}</div>
            </div>
            <div className="p-4 bg-content2 rounded-medium text-center">
              <div className="text-sm text-default-600 mb-1">Ребаи</div>
              <div className="text-xl font-semibold">{totalRebuyFees.toLocaleString()}</div>
              <div className="text-xs text-default-500">
                {state.players?.reduce((sum, p) => sum + p.rebuys, 0) || 0} × {state.rebuyFee.toLocaleString()}
              </div>
            </div>
            <div className="p-4 bg-content2 rounded-medium text-center">
              <div className="text-sm text-default-600 mb-1">Аддоны</div>
              <div className="text-xl font-semibold">{totalAddonFees.toLocaleString()}</div>
              <div className="text-xs text-default-500">
                {state.players?.reduce((sum, p) => sum + p.addons, 0) || 0} × {state.addonFee.toLocaleString()}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Player Rankings */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Рейтинг игроков</h2>
        </CardHeader>
        <CardBody>
          <Table removeWrapper aria-label="Рейтинг игроков">
            <TableHeader>
              <TableColumn>Место</TableColumn>
              <TableColumn>Игрок</TableColumn>
              <TableColumn>Статус</TableColumn>
              <TableColumn>Фишки</TableColumn>
              <TableColumn>Баунти</TableColumn>
              <TableColumn>Оплачено</TableColumn>
            </TableHeader>
            <TableBody emptyContent="Нет зарегистрированных игроков">
              {sortedPlayers.map((player, index) => {
                const totalChips = 
                  player.initialChips + 
                  (player.rebuys * state.rebuyChips) + 
                  (player.addons * state.addonChips);
                  
                const totalCost = 
                  state.entryFee + 
                  (player.rebuys * state.rebuyFee) + 
                  (player.addons * state.addonFee);
                
                const paidAmount = player.paidAmount || 0;
                const isPaidFully = paidAmount >= totalCost;
                
                return (
                  <TableRow key={player.id} className={player.isEliminated ? "opacity-70" : ""}>
                    <TableCell>
                      {player.isEliminated 
                        ? `${state.players?.length || 0 - player.eliminationOrder! + 1}` 
                        : `${index + 1}`}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{player.name}</div>
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
                    <TableCell>{totalChips.toLocaleString()}</TableCell>
                    <TableCell>{player.bountyChips || 0}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={isPaidFully ? "text-success" : "text-danger"}>
                          {paidAmount.toLocaleString()} / {totalCost.toLocaleString()}
                        </span>
                        {isPaidFully && (
                          <Icon icon="lucide:check" className="text-success" />
                        )}
                      </div>
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